package admin

import (
	"chat/globals"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

type UsageLog struct {
	ID                 int64   `json:"id"`
	UserID             int64   `json:"user_id"`
	Type               string  `json:"type"`
	Model              string  `json:"model"`
	InputTokens        int     `json:"input_tokens"`
	OutputTokens       int     `json:"output_tokens"`
	QuotaCost          float32 `json:"quota_cost"`
	ConversationID     int     `json:"conversation_id"`
	IsPlan             bool    `json:"is_plan"`
	Amount             float32 `json:"amount"`
	QuotaChange        float32 `json:"quota_change"`
	SubscriptionLevel  int     `json:"subscription_level"`
	SubscriptionMonths int     `json:"subscription_months"`
	Detail             string  `json:"detail"`
	CreatedAt          string  `json:"created_at"`
}

type UsageLogData struct {
	ID                 int64   `json:"id"`
	UserID             int64   `json:"user_id"`
	Username           string  `json:"username"`
	Type               string  `json:"type"`
	Model              string  `json:"model"`
	InputTokens        int     `json:"input_tokens"`
	OutputTokens       int     `json:"output_tokens"`
	QuotaCost          float32 `json:"quota_cost"`
	ConversationID     int     `json:"conversation_id"`
	IsPlan             bool    `json:"is_plan"`
	Amount             float32 `json:"amount"`
	QuotaChange        float32 `json:"quota_change"`
	SubscriptionLevel  int     `json:"subscription_level"`
	SubscriptionMonths int     `json:"subscription_months"`
	Detail             string  `json:"detail"`
	CreatedAt          string  `json:"created_at"`
}

// CreateUsageLog inserts a new usage log entry
func CreateUsageLog(db *sql.DB, log *UsageLog) error {
	_, err := globals.ExecDb(db, `
		INSERT INTO usage_log (
			user_id, type, model, input_tokens, output_tokens, quota_cost,
			conversation_id, is_plan, amount, quota_change, subscription_level,
			subscription_months, detail
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, log.UserID, log.Type, log.Model, log.InputTokens, log.OutputTokens,
		log.QuotaCost, log.ConversationID, log.IsPlan, log.Amount,
		log.QuotaChange, log.SubscriptionLevel, log.SubscriptionMonths, log.Detail)

	return err
}

// GetUsageLogPagination retrieves usage logs with pagination and filters
func GetUsageLogPagination(db *sql.DB, page int64, username string, logType string, startDate string, endDate string) PaginationForm {
	var logs []interface{}
	var total int64

	// Build WHERE clause
	whereConditions := []string{"1=1"}
	args := []interface{}{}

	if username != "" {
		whereConditions = append(whereConditions, "auth.username LIKE ?")
		args = append(args, "%"+username+"%")
	}

	if logType != "" && logType != "all" {
		whereConditions = append(whereConditions, "usage_log.type = ?")
		args = append(args, logType)
	}

	if startDate != "" {
		whereConditions = append(whereConditions, "usage_log.created_at >= ?")
		args = append(args, startDate)
	}

	if endDate != "" {
		whereConditions = append(whereConditions, "usage_log.created_at <= ?")
		args = append(args, endDate)
	}

	whereClause := strings.Join(whereConditions, " AND ")

	// Count total records
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*) FROM usage_log
		LEFT JOIN auth ON auth.id = usage_log.user_id
		WHERE %s
	`, whereClause)

	if err := globals.QueryRowDb(db, countQuery, args...).Scan(&total); err != nil {
		return PaginationForm{
			Status:  false,
			Message: err.Error(),
		}
	}

	// Fetch paginated data
	dataQuery := fmt.Sprintf(`
		SELECT
			usage_log.id, usage_log.user_id, auth.username, usage_log.type,
			usage_log.model, usage_log.input_tokens, usage_log.output_tokens,
			usage_log.quota_cost, usage_log.conversation_id, usage_log.is_plan,
			usage_log.amount, usage_log.quota_change, usage_log.subscription_level,
			usage_log.subscription_months, usage_log.detail, usage_log.created_at
		FROM usage_log
		LEFT JOIN auth ON auth.id = usage_log.user_id
		WHERE %s
		ORDER BY usage_log.created_at DESC
		LIMIT ? OFFSET ?
	`, whereClause)

	paginationArgs := append(args, pagination, page*pagination)
	rows, err := globals.QueryDb(db, dataQuery, paginationArgs...)
	if err != nil {
		return PaginationForm{
			Status:  false,
			Message: err.Error(),
		}
	}
	defer rows.Close()

	for rows.Next() {
		var log UsageLogData
		var (
			username           sql.NullString
			model              sql.NullString
			inputTokens        sql.NullInt64
			outputTokens       sql.NullInt64
			quotaCost          sql.NullFloat64
			conversationID     sql.NullInt64
			isPlan             sql.NullBool
			amount             sql.NullFloat64
			quotaChange        sql.NullFloat64
			subscriptionLevel  sql.NullInt64
			subscriptionMonths sql.NullInt64
			detail             sql.NullString
			createdAt          []uint8
		)

		if err := rows.Scan(
			&log.ID, &log.UserID, &username, &log.Type,
			&model, &inputTokens, &outputTokens, &quotaCost,
			&conversationID, &isPlan, &amount, &quotaChange,
			&subscriptionLevel, &subscriptionMonths, &detail, &createdAt,
		); err != nil {
			return PaginationForm{
				Status:  false,
				Message: err.Error(),
			}
		}

		// Handle nullable fields
		if username.Valid {
			log.Username = username.String
		} else {
			log.Username = "-"
		}
		if model.Valid {
			log.Model = model.String
		}
		if inputTokens.Valid {
			log.InputTokens = int(inputTokens.Int64)
		}
		if outputTokens.Valid {
			log.OutputTokens = int(outputTokens.Int64)
		}
		if quotaCost.Valid {
			log.QuotaCost = float32(quotaCost.Float64)
		}
		if conversationID.Valid {
			log.ConversationID = int(conversationID.Int64)
		}
		if isPlan.Valid {
			log.IsPlan = isPlan.Bool
		}
		if amount.Valid {
			log.Amount = float32(amount.Float64)
		}
		if quotaChange.Valid {
			log.QuotaChange = float32(quotaChange.Float64)
		}
		if subscriptionLevel.Valid {
			log.SubscriptionLevel = int(subscriptionLevel.Int64)
		}
		if subscriptionMonths.Valid {
			log.SubscriptionMonths = int(subscriptionMonths.Int64)
		}
		if detail.Valid {
			log.Detail = detail.String
		}

		// Format timestamp
		if t, err := time.Parse("2006-01-02 15:04:05", string(createdAt)); err == nil {
			log.CreatedAt = t.Format("2006-01-02 15:04:05")
		} else {
			log.CreatedAt = string(createdAt)
		}

		logs = append(logs, log)
	}

	return PaginationForm{
		Status: true,
		Total:  int(total),
		Data:   logs,
	}
}
