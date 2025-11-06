package auth

import (
	"chat/channel"
	"database/sql"
	"math"
	"time"

	"github.com/go-redis/redis/v8"
)

func (u *User) GetSubscriptionUsage(db *sql.DB, cache *redis.Client) channel.UsageMap {
	plan := u.GetPlan(db)
	return plan.GetUsage(u, db, cache)
}

func (u *User) GetSubscriptionRefreshAt(db *sql.DB, cache *redis.Client) time.Time {
	if disableSubscription() || !u.IsSubscribe(db) {
		return time.Unix(0, 0)
	}

	plan := u.GetPlan(db)
	if len(plan.Items) == 0 {
		return time.Unix(0, 0)
	}

	var next time.Time
	for i, item := range plan.Items {
		_, offset := channel.GetSubscriptionUsage(cache, u, item.Id)
		n := offset.AddDate(0, 1, 0)
		if i == 0 || n.Before(next) {
			next = n
		}
	}
	return next
}

func (u *User) GetSubscriptionRefreshDay(db *sql.DB, cache *redis.Client) int {
	at := u.GetSubscriptionRefreshAt(db, cache)
	if at.Unix() <= 0 {
		return 0
	}
	diff := time.Until(at)
	return int(math.Round(diff.Hours() / 24))
}
