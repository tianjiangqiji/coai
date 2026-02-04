package manager

import (
	"chat/adapter"
	adaptercommon "chat/adapter/common"
	"chat/addition/web"
	"chat/admin"
	"chat/auth"
	"chat/channel"
	"chat/globals"
	"chat/manager/conversation"
	"chat/utils"
	"time"

	"database/sql"
	"errors"
	"fmt"
	"runtime/debug"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

const defaultMessage = "empty response"
const interruptMessage = "interrupted"

func CollectQuota(c *gin.Context, user *auth.User, buffer *utils.Buffer, uncountable bool, detail *auth.SubscriptionUsageDetail, err error) {
	db := utils.GetDBFromContext(c)
	CollectQuotaWithDB(db, user, buffer, uncountable, detail, err)
}

func CollectQuotaWithDB(db *sql.DB, user *auth.User, buffer *utils.Buffer, uncountable bool, detail *auth.SubscriptionUsageDetail, err error) {
	if user == nil || buffer == nil || err != nil {
		return
	}

	quota := buffer.GetQuota()
	var quotaCost = quota
	var quotaChange float32

	if !uncountable {
		user.UseQuota(db, quota)
		quotaChange = -quota
	} else {
		quotaCost = 0
	}

	var detailText string
	if detail != nil {
		name := detail.ItemName
		if name == "" {
			name = detail.ItemID
		}
		total := "∞"
		if detail.Total >= 0 {
			total = fmt.Sprintf("%d", detail.Total)
		}
		detailText = fmt.Sprintf("(订阅消耗[%s] 用量：%d/%s)", name, detail.Used, total)
	}

	// Log usage
	_ = admin.CreateUsageLog(db, &admin.UsageLog{
		UserID:         user.GetID(db),
		Type:           "consume",
		Model:          buffer.GetModel(),
		InputTokens:    buffer.CountInputToken(),
		OutputTokens:   buffer.CountOutputToken(false),
		QuotaCost:      quotaCost,
		QuotaChange:    quotaChange,
		ConversationID: buffer.GetConversation(),
		IsPlan:         uncountable,
		Detail:         strings.TrimSpace(fmt.Sprintf("%s (%d→%d tokens) %s", buffer.GetModel(), buffer.CountInputToken(), buffer.CountOutputToken(false), detailText)),
	})

	admin.AnalyseRequest(buffer.GetModel(), buffer, err)
}

type partialChunk struct {
	Chunk *globals.Chunk
	End   bool
	Hit   bool
	Error error
}

func createStopSignal(conn *Connection) chan bool {
	stopSignal := make(chan bool, 1)
	go func(conn *Connection, stopSignal chan bool) {
		ticker := time.NewTicker(100 * time.Millisecond)
		defer func() {
			ticker.Stop()
			if r := recover(); r != nil && !strings.Contains(fmt.Sprintf("%s", r), "closed channel") {
				stack := debug.Stack()
				globals.Warn(fmt.Sprintf("caught panic from stop signal: %s\n%s", r, stack))
			}
		}()

		for range ticker.C {
			state := conn.PeekStop() != nil // check the stop state
			stopSignal <- state

			if state {
				return
			}
		}
	}(conn, stopSignal)

	return stopSignal
}

func createChatTask(
	conn *Connection, user *auth.User, buffer *utils.Buffer, db *sql.DB, cache *redis.Client,
	model string, instance *conversation.Conversation, segment []globals.Message, think *bool, plan bool,
) (hit bool, err error) {
	chunkChan := make(chan partialChunk, 24) // the channel to send the chunk data
	interruptSignal := make(chan error, 1)   // the signal to interrupt the chat task routine
	stopSignal := createStopSignal(conn)     // the signal to stop from the client

	defer func() {
		// close all channels
		close(interruptSignal)
		close(stopSignal)
		close(chunkChan)
	}()

	// create a new chat request routine
	go func() {
		defer func() {
			if r := recover(); r != nil && !strings.Contains(fmt.Sprintf("%s", r), "closed channel") {
				stack := debug.Stack()
				globals.Warn(fmt.Sprintf("caught panic from chat request: %s\n%s", r, stack))
			}
		}()

		if globals.IsVideoModel(model) {
			props := adaptercommon.CreateVideoProps(&adaptercommon.VideoProps{
				Model:  model,
				Prompt: segment[len(segment)-1].Content,
			})
			props.User = auth.GetUsernameString(db, user)

			var finalJobJson string
			hit, err := channel.NewVideoRequestWithCache(
				cache, buffer,
				auth.GetGroup(db, user),
				props,
				func(data *globals.Chunk) error {
					if data != nil && data.Content != "" {
						if strings.HasPrefix(data.Content, "{") && strings.Contains(data.Content, "\"id\"") && strings.Contains(data.Content, "\"status\"") {
							finalJobJson = data.Content
							job, err := utils.UnmarshalString[RelayVideoJob](data.Content)
							if err == nil && job.Id != "" && job.Status == "completed" {
								backendUrl := channel.SystemInstance.GetBackend()
								videoUrl := fmt.Sprintf("%s/v1/videos/%s/content", backendUrl, job.Id)
								videoMarkdown := utils.GetVideoMarkdown(videoUrl, "video")

								chunkChan <- partialChunk{Chunk: &globals.Chunk{Content: videoMarkdown}, End: false, Hit: false, Error: nil}
								return nil
							}
						}
					}

					chunkChan <- partialChunk{Chunk: data, End: false, Hit: false, Error: nil}
					return nil
				},
			)

			if err == nil && finalJobJson != "" {
				job, err := utils.UnmarshalString[RelayVideoJob](finalJobJson)
				if err == nil && job.Id != "" {
					globals.Debug(fmt.Sprintf("[video] saving task_id %s to conversation %d", job.Id, instance.GetId()))
					instance.SetTaskID(job.Id)
					if !instance.SaveConversation(db) {
						globals.Warn(fmt.Sprintf("[video] failed to save conversation with task_id %s", job.Id))
					} else {
						globals.Debug(fmt.Sprintf("[video] successfully saved task_id %s to conversation %d", job.Id, instance.GetId()))
					}
				}
			}

			chunkChan <- partialChunk{Chunk: nil, End: true, Hit: hit, Error: err}
			return
		}

		hit, err := channel.NewChatRequestWithCache(
			cache, buffer,
			auth.GetGroup(db, user),
			adaptercommon.CreateChatProps(&adaptercommon.ChatProps{
				Model:             model,
				Message:           segment,
				MaxTokens:         instance.GetMaxTokens(),
				Temperature:       instance.GetTemperature(),
				TopP:              instance.GetTopP(),
				TopK:              instance.GetTopK(),
				PresencePenalty:   instance.GetPresencePenalty(),
				FrequencyPenalty:  instance.GetFrequencyPenalty(),
				RepetitionPenalty: instance.GetRepetitionPenalty(),
				Think:             think,
			}, buffer),

			// the function to handle the chunk data
			func(data *globals.Chunk) error {
				// if interrupt signal is received
				if len(interruptSignal) > 0 {
					return errors.New(interruptMessage)
				}

				// send the chunk data to the channel
				chunkChan <- partialChunk{
					Chunk: data,
					End:   false,
					Hit:   false,
					Error: nil,
				}
				return nil
			},
		)

		// chat request routine is done
		chunkChan <- partialChunk{
			Chunk: nil,
			End:   true,
			Hit:   hit,
			Error: err,
		}
	}()

	for data := range chunkChan {
		if data.Error != nil && data.Error.Error() == interruptMessage {
			// skip the interrupt message
			continue
		}

		hit = data.Hit
		err = data.Error

		if data.End {
			return
		}

		select {
		case <-stopSignal:
			globals.Info(fmt.Sprintf("client stopped the chat request (model: %s, client: %s)", model, conn.GetCtx().ClientIP()))
			_ = conn.SendClient(globals.ChatSegmentResponse{
				Quota: buffer.GetQuota(),
				End:   true,
				Plan:  plan,
			})
			interruptSignal <- errors.New("signal")
			return
		default:
			if err := conn.SendClient(globals.ChatSegmentResponse{
				Message: buffer.WriteChunk(data.Chunk),
				Quota:   buffer.GetQuota(),
				End:     false,
				Plan:    plan,
			}); err != nil {
				globals.Warn(fmt.Sprintf("failed to send message to client: %s", err.Error()))
				interruptSignal <- err
				return hit, nil
			}
		}
	}
	return
}

func ChatHandler(conn *Connection, user *auth.User, instance *conversation.Conversation, restart bool) string {
	defer func() {
		if err := recover(); err != nil {
			stack := debug.Stack()
			globals.Warn(fmt.Sprintf("caught panic from chat handler: %s (instance: %s, client: %s)\n%s",
				err, instance.GetModel(), conn.GetCtx().ClientIP(), stack,
			))
		}
	}()

	db := conn.GetDB()
	cache := conn.GetCache()

	model := instance.GetModel()
	segment := adapter.ClearMessages(model, web.ToChatSearched(db, cache, user, instance, restart))
	thinkState := instance.GetThink()
	segment = utils.ApplyThinkingDirective(segment, thinkState)

	plan, usageDetail, check := auth.CanEnableModelWithSubscription(db, cache, user, model, segment)
	conn.Send(globals.ChatSegmentResponse{
		Conversation: instance.GetId(),
	})

	if check != nil {
		message := check.Error()
		conn.Send(globals.ChatSegmentResponse{
			Message: message,
			Quota:   0,
			End:     true,
		})
		return message
	}

	buffer := utils.NewBuffer(model, segment, channel.ChargeInstance.GetCharge(model))
	buffer.SetConversation(int(instance.GetId()))
	_, err := createChatTask(conn, user, buffer, db, cache, model, instance, segment, thinkState, plan)

	admin.AnalyseRequest(model, buffer, err)
	if adapter.IsAvailableError(err) {
		globals.Warn(fmt.Sprintf("%s (model: %s, client: %s)", err, model, conn.GetCtx().ClientIP()))

		auth.RevertSubscriptionUsage(db, cache, user, model)
		conn.Send(globals.ChatSegmentResponse{
			Message: err.Error(),
			End:     true,
		})
		return err.Error()
	}

	// 命中缓存同样记录消费（quota 为 0 也可记录），方便审计
	CollectQuota(conn.GetCtx(), user, buffer, plan, usageDetail, err)

	if buffer.IsEmpty() {
		conn.Send(globals.ChatSegmentResponse{
			Message: defaultMessage,
			End:     true,
		})
		return defaultMessage
	}

	conn.Send(globals.ChatSegmentResponse{
		End:   true,
		Quota: buffer.GetQuota(),
		Plan:  plan,
	})

	return buffer.ReadWithDefault(defaultMessage)
}
