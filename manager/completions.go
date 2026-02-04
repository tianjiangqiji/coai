package manager

import (
	adaptercommon "chat/adapter/common"
	"chat/addition/web"
	"chat/admin"
	"chat/auth"
	"chat/channel"
	"chat/globals"
	"chat/utils"
	"fmt"
	"runtime/debug"

	"github.com/gin-gonic/gin"
)

func NativeChatHandler(c *gin.Context, user *auth.User, model string, message []globals.Message, enableWeb bool) (string, float32) {
	defer func() {
		if err := recover(); err != nil {
			stack := debug.Stack()
			globals.Warn(fmt.Sprintf("caught panic from chat handler: %s (instance: %s, client: %s)\n%s",
				err, model, c.ClientIP(), stack,
			))
		}
	}()

	db := utils.GetDBFromContext(c)
	cache := utils.GetCacheFromContext(c)
	segment := web.ToSearched(db, cache, user, model, enableWeb, message)
	thinkState := globals.ResolveThinkingPreference(model, nil)
	segment = utils.ApplyThinkingDirective(segment, thinkState)
	plan, usageDetail, check := auth.CanEnableModelWithSubscription(db, cache, user, model, segment)

	if check != nil {
		return check.Error(), 0
	}

	buffer := utils.NewBuffer(model, segment, channel.ChargeInstance.GetCharge(model))
	_, err := channel.NewChatRequestWithCache(
		cache, buffer,
		auth.GetGroup(db, user),
		adaptercommon.CreateChatProps(&adaptercommon.ChatProps{
			Model:   model,
			Message: segment,
			Think:   thinkState,
		}, buffer),
		func(resp *globals.Chunk) error {
			buffer.WriteChunk(resp)
			return nil
		},
	)

	admin.AnalyseRequest(model, buffer, err)
	if err != nil {
		auth.RevertSubscriptionUsage(db, cache, user, model)
		return err.Error(), 0
	}

	// 命中缓存也记录一次消费（若为缓存则配额为 0），便于审计
	CollectQuota(c, user, buffer, plan, usageDetail, err)

	return buffer.ReadWithDefault(defaultMessage), buffer.GetQuota()
}
