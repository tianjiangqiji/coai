package manager

import (
	adaptercommon "chat/adapter/common"
	"chat/admin"
	"chat/auth"
	"chat/channel"
	"chat/globals"
	"chat/utils"
	"fmt"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/gin-gonic/gin"
)

func VideosRelayAPI(c *gin.Context) {
	defer func() {
		if err := recover(); err != nil {
			stack := debug.Stack()
			globals.Warn(fmt.Sprintf("caught panic from chat completions api: %s (client: %s)\n%s",
				err, c.ClientIP(), stack,
			))
		}
	}()

	if globals.CloseRelay {
		abortWithErrorResponse(c, fmt.Errorf("relay api is denied of access"), "access_denied_error")
		return
	}

	username := utils.GetUserFromContext(c)
	if username == "" {
		abortWithErrorResponse(c, fmt.Errorf("access denied for invalid api key"), "authentication_error")
		return
	}

	if utils.GetAgentFromContext(c) != "api" {
		abortWithErrorResponse(c, fmt.Errorf("access denied for invalid agent"), "authentication_error")
		return
	}

	var form RelayVideoForm
	if err := c.ShouldBindJSON(&form); err != nil {
		abortWithErrorResponse(c, fmt.Errorf("invalid request body: %s", err.Error()), "invalid_request_error")
		return
	}

	prompt := strings.TrimSpace(form.Prompt)
	if prompt == "" {
		sendErrorResponse(c, fmt.Errorf("prompt is required"), "invalid_request_error")
		return
	}

	db := utils.GetDBFromContext(c)
	cache := utils.GetCacheFromContext(c)
	user := &auth.User{
		Username: username,
	}

	form.Model = strings.TrimSuffix(form.Model, "-official")

	if form.Model == "" {
		form.Model = globals.Sora2
	}

	messages := []globals.Message{
		{Role: globals.User, Content: prompt},
	}
	plan, _, check := checkEnableState(db, cache, user, form.Model, messages)
	if check != nil {
		sendErrorResponse(c, check, "quota_exceeded_error")
		return
	}

	buffer := utils.NewBuffer(form.Model, messages, channel.ChargeInstance.GetCharge(form.Model))
	buffer.SetTokenName(globals.ApiTokenType)

	props := adaptercommon.CreateVideoProps(&adaptercommon.VideoProps{
		Model:          form.Model,
		Prompt:         prompt,
		Seconds:        form.Seconds,
		Size:           form.Size,
		InputReference: form.InputReference,
	})
	props.User = auth.GetUsernameString(db, user)

	group := auth.GetGroup(db, user)

	var jobJson string
	hit, err := channel.NewVideoRequestWithCache(cache, buffer, group, props, func(data *globals.Chunk) error {
		if data != nil {
			jobJson = data.Content
		}
		return nil
	})

	admin.AnalyseRequest(form.Model, buffer, err)
	if err != nil {
		auth.RevertSubscriptionUsage(db, cache, user, form.Model)
		globals.Warn(fmt.Sprintf("error from video request api: %s (instance: %s, client: %s)", err, form.Model, c.ClientIP()))
		sendErrorResponse(c, err)
		return
	}

	if !hit {
		CollectQuota(c, user, buffer, plan, nil, err)
	}

	job, jerr := utils.UnmarshalString[RelayVideoJob](jobJson)
	if jerr != nil {
		sendErrorResponse(c, fmt.Errorf("invalid job response: %s", jerr.Error()))
		return
	}

	if job.Id != "" {
		userId := user.GetID(db)
		var conversationId int64
		err := globals.QueryRowDb(db, `
			SELECT conversation_id
			FROM conversation
			WHERE user_id = ? AND model = ? AND (task_id IS NULL OR task_id = '')
			ORDER BY updated_at DESC
			LIMIT 1
		`, userId, form.Model).Scan(&conversationId)
		if err == nil && conversationId > 0 {
			globals.Debug(fmt.Sprintf("[video] saving task_id %s to conversation %d for user %d", job.Id, conversationId, userId))
			_, err := globals.ExecDb(db, `
				UPDATE conversation
				SET task_id = ?
				WHERE user_id = ? AND conversation_id = ?
			`, job.Id, userId, conversationId)
			if err != nil {
				globals.Warn(fmt.Sprintf("failed to save task_id to conversation: %s", err.Error()))
			} else {
				globals.Debug(fmt.Sprintf("[video] successfully saved task_id %s to conversation %d", job.Id, conversationId))
			}
		} else {
			if err != nil && err.Error() != "sql: no rows in result set" {
				globals.Warn(fmt.Sprintf("[video] failed to find conversation to update task_id: %s", err.Error()))
			}
		}
	} else {
		globals.Warn("[video] job.Id is empty, cannot save task_id")
	}

	c.JSON(http.StatusOK, job)
}

func VideosContentRelayAPI(c *gin.Context) {
	defer func() {
		if err := recover(); err != nil {
			stack := debug.Stack()
			globals.Warn(fmt.Sprintf("caught panic from videos content api: %s (client: %s)\n%s",
				err, c.ClientIP(), stack,
			))
		}
	}()

	if globals.CloseRelay {
		abortWithErrorResponse(c, fmt.Errorf("relay api is denied of access"), "access_denied_error")
		return
	}

	db := utils.GetDBFromContext(c)

	username := utils.GetUserFromContext(c)
	if username == "" {
		abortWithErrorResponse(c, fmt.Errorf("access denied for invalid api key"), "authentication_error")
		return
	}

	agent := utils.GetAgentFromContext(c)
	if agent != "api" && agent != "token" {
		abortWithErrorResponse(c, fmt.Errorf("access denied for invalid agent"), "authentication_error")
		return
	}

	id := strings.TrimSpace(c.Param("id"))
	if id == "" {
		abortWithErrorResponse(c, fmt.Errorf("video id is required"), "invalid_request_error")
		return
	}

	user := &auth.User{Username: username}
	userId := user.GetID(db)
	var jobModel interface{}

	err := globals.QueryRowDb(db, `
		SELECT model
		FROM conversation
		WHERE user_id = ? AND task_id = ?
		LIMIT 1
	`, userId, id).Scan(&jobModel)

	if err != nil {
		abortWithErrorResponse(c, fmt.Errorf("cannot find video job for video id %s", id), "invalid_request_error")
		return
	}

	var model string
	if value, ok := jobModel.([]byte); ok {
		model = string(value)
	} else if str, ok := jobModel.(string); ok {
		model = str
	} else {
		abortWithErrorResponse(c, fmt.Errorf("cannot parse model from conversation for video id %s", id), "invalid_request_error")
		return
	}
	group := auth.GetGroup(db, user)
	ticker := channel.ConduitInstance.GetTicker(model, group)
	if ticker == nil || ticker.IsEmpty() {
		abortWithErrorResponse(c, fmt.Errorf("cannot find channel for model %s", model), "invalid_request_error")
		return
	}

	var lastErr error
	for !ticker.IsDone() {
		ch := ticker.Next()
		if ch == nil {
			break
		}

		endpoint := ch.GetEndpoint()
		secret := ch.GetRandomSecret()
		uri := fmt.Sprintf("%s/v1/videos/%s/content", endpoint, id)

		headers := map[string]string{
			"Authorization": fmt.Sprintf("Bearer %s", secret),
		}

		data, err := utils.HttpRaw(uri, http.MethodGet, headers, nil, []globals.ProxyConfig{ch.GetProxy()})
		if err != nil || data == nil {
			lastErr = err
			continue
		}

		contentType := "video/mp4"
		c.Data(http.StatusOK, contentType, data)
		return
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("failed to fetch video content")
	}
	sendErrorResponse(c, lastErr)
}
