package auth

import (
	"chat/channel"
	"database/sql"
	"fmt"

	"chat/globals"
	"chat/utils"

	"github.com/go-redis/redis/v8"
)

const (
	ErrNotAuthenticated = "not authenticated error (model: %s)"
	ErrNotSetPrice      = "the price of the model is not set (model: %s)"
	ErrNotEnoughQuota   = "user quota is not enough error (model: %s, minimum quota: %0.2f, your quota: %0.2f)"
	ErrEstimatedCost    = "estimated cost exceeds user quota (model: %s, estimated cost: %0.2f, your quota: %0.2f)"
)

// CanEnableModel returns whether the model can be enabled (without subscription)
func CanEnableModel(db *sql.DB, user *User, model string, messages []globals.Message) error {
	isAuth := user != nil
	isAdmin := isAuth && user.IsAdmin(db)

	charge := channel.ChargeInstance.GetCharge(model)

	if charge.IsUnsetType() && !isAdmin {
		return fmt.Errorf(ErrNotSetPrice, model)
	}

	if !charge.IsBilling() {
		// return if is the user is authenticated or anonymous is allowed for this model
		if charge.SupportAnonymous() || isAuth {
			return nil
		}

		return fmt.Errorf(ErrNotAuthenticated, model)
	}

	if !isAuth {
		return fmt.Errorf(ErrNotAuthenticated, model)
	}

	// Calculate estimated input cost
	inputTokens := utils.NumTokensFromMessages(messages, model, false)
	estimatedInputCost := float32(inputTokens) / 1000 * charge.GetInput()

	// Get user's current quota
	quota := user.GetQuota(db)
	if quota < estimatedInputCost {
		return fmt.Errorf(ErrEstimatedCost, model, estimatedInputCost, quota)
	}

	return nil
}

func CanEnableModelWithSubscription(db *sql.DB, cache *redis.Client, user *User, model string, messages []globals.Message) (canEnable error, usePlan bool, usageDetail *SubscriptionUsageDetail) {
	// use subscription quota first
	if user != nil {
		if detail, ok := HandleSubscriptionUsage(db, cache, user, model); ok {
			return nil, true, detail
		}
	}

	return CanEnableModel(db, user, model, messages), false, nil
}
