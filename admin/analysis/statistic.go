package analysis

import (
	"chat/adapter"
	"chat/connection"
	"chat/utils"
	"time"

	"github.com/go-redis/redis/v8"
)

func IncrErrorRequest(cache *redis.Client) {
	utils.IncrOnce(cache, getErrorFormat(getDay()), time.Hour*24*7*2)
}

func IncrBillingRequest(cache *redis.Client, amount int64, isAdmin bool) {
	if isAdmin {
		// do not count billing for admin user
		return
	}

	utils.IncrWithExpire(cache, getBillingFormat(getDay()), amount, time.Hour*24*90)        // 90 days
	utils.IncrWithExpire(cache, getMonthBillingFormat(getMonth()), amount, time.Hour*24*90) // 90 days
}

func IncrRequest(cache *redis.Client) {
	utils.IncrOnce(cache, getRequestFormat(getDay()), time.Hour*24*7*2)
}

func IncrModelRequest(cache *redis.Client, model string, tokens int64) {
	utils.IncrWithExpire(cache, getModelFormat(getDay(), model), tokens, time.Hour*24*7*2)
}

func AnalyseRequest(model string, user string, buffer *utils.Buffer, err error) {
	instance := connection.Cache

	if adapter.IsAvailableError(err) {
		IncrErrorRequest(instance)
		return
	}

	token := int64(buffer.CountInputToken() + buffer.CountOutputToken(false))

	IncrRequest(instance)
	IncrModelRequest(instance, model, token)

	if buffer != nil {
		IncrRpm(instance, user, 1)
		IncrTpm(instance, user, token)

		// add rpm/tpm to root
		IncrRpm(instance, "root", 1)
		IncrTpm(instance, "root", token)
	}
}

func IncrTpm(cache *redis.Client, user string, n int64) {
	utils.IncrWithExpire(cache, getTpmFormat(getMinuteFormat(time.Now()), user), n, time.Minute*5)
}

func IncrRpm(cache *redis.Client, user string, n int64) {
	utils.IncrWithExpire(cache, getRpmFormat(getMinuteFormat(time.Now()), user), n, time.Minute*5)
}
