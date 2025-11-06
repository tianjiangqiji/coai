package auth

import (
	"chat/globals"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const (
	paymentStatusPending = "pending"
	paymentStatusPaid    = "paid"
)

type PaymentOrder struct {
	ID        int64
	OrderNo   string
	UserID    int64
	Amount    float64
	Quota     float64
	Method    string
	Status    string
	TradeNo   string
	ReturnURL string
	PaidAt    *time.Time
	CreatedAt *time.Time
}

func createEpayOrder(db *sql.DB, user *User, amount float64, method, returnURL string) (*PaymentOrder, error) {
	if user == nil {
		return nil, errors.New("user is required")
	}

	orderNo := GenerateOrder()
	uid := user.GetID(db)
	if uid == 0 {
		return nil, errors.New("failed to resolve user id")
	}

	method = strings.TrimSpace(method)
	returnURL = strings.TrimSpace(returnURL)

	quota := amount * globals.PaymentQuotaRatio

	_, err := globals.ExecDb(db, `
		INSERT INTO payment_order (order_no, user_id, amount, quota, method, status, return_url)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, orderNo, uid, amount, quota, method, paymentStatusPending, returnURL)
	if err != nil {
		return nil, err
	}

	now := time.Now()

	return &PaymentOrder{
		OrderNo:   orderNo,
		UserID:    uid,
		Amount:    amount,
		Quota:     quota,
		Method:    method,
		Status:    paymentStatusPending,
		ReturnURL: returnURL,
		CreatedAt: &now,
	}, nil
}

func getEpayOrderByOrderNo(db *sql.DB, orderNo string) (*PaymentOrder, error) {
	orderNo = strings.TrimSpace(orderNo)
	if orderNo == "" {
		return nil, errors.New("order number is required")
	}

	var order PaymentOrder
	var trade sql.NullString
	var ret sql.NullString
	var paidAt sql.NullString
	var createdAt sql.NullString

	err := globals.QueryRowDb(db, `
		SELECT id, order_no, user_id, amount, quota, method, status, trade_no, return_url, paid_at, created_at
		FROM payment_order
		WHERE order_no = ?
	`, orderNo).Scan(
		&order.ID,
		&order.OrderNo,
		&order.UserID,
		&order.Amount,
		&order.Quota,
		&order.Method,
		&order.Status,
		&trade,
		&ret,
		&paidAt,
		&createdAt,
	)
	if err != nil {
		return nil, err
	}

	if trade.Valid {
		order.TradeNo = trade.String
	}
	if ret.Valid {
		order.ReturnURL = ret.String
	}
	if paidAt.Valid {
		if t, err := parseSQLTime(paidAt.String); err != nil {
			globals.Warn(fmt.Sprintf("[payment] failed to parse paid_at for order %s: %v", order.OrderNo, err))
		} else if t != nil {
			order.PaidAt = t
		}
	}
	if createdAt.Valid {
		if t, err := parseSQLTime(createdAt.String); err != nil {
			globals.Warn(fmt.Sprintf("[payment] failed to parse created_at for order %s: %v", order.OrderNo, err))
		} else if t != nil {
			order.CreatedAt = t
		}
	}

	return &order, nil
}

func markEpayOrderPaid(db *sql.DB, order *PaymentOrder, tradeNo string) (bool, error) {
	if order == nil {
		return false, errors.New("order is nil")
	}

	result, err := globals.ExecDb(db, `
		UPDATE payment_order
		SET status = ?, trade_no = ?, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE order_no = ? AND status != ?
	`, paymentStatusPaid, tradeNo, order.OrderNo, paymentStatusPaid)
	if err != nil {
		return false, err
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}

	if affected > 0 {
		order.Status = paymentStatusPaid
		order.TradeNo = tradeNo
		now := time.Now()
		order.PaidAt = &now
	}

	return affected > 0, nil
}

func buildEpayPaymentURL(order *PaymentOrder, notifyURL, returnURL, method string) (string, map[string]string, error) {
	if order == nil {
		return "", nil, errors.New("order is nil")
	}

	config := globals.PaymentEpay
	if !config.Enabled {
		return "", nil, errors.New("epay not enabled")
	}
	if config.Domain == "" {
		return "", nil, errors.New("epay domain missing")
	}
	if config.BusinessID == "" {
		return "", nil, errors.New("epay merchant id missing")
	}
	if config.BusinessKey == "" {
		return "", nil, errors.New("epay merchant key missing")
	}
	if notifyURL == "" {
		return "", nil, errors.New("notify url missing")
	}
	if method == "" {
		method = "alipay"
	}

	base := strings.TrimSuffix(config.Domain, "/")
	requestURL := fmt.Sprintf("%s/submit.php", base)

	title := order.OrderNo
	if len(title) > 16 {
		title = title[:16]
	}

	params := map[string]string{
		"pid":          config.BusinessID,
		"type":         method,
		"out_trade_no": order.OrderNo,
		"notify_url":   notifyURL,
		"return_url":   returnURL,
		"name":         fmt.Sprintf("Quota Recharge %s", title),
		"money":        fmt.Sprintf("%.2f", order.Amount),
		"param":        fmt.Sprintf("%d", order.UserID),
		"sign_type":    "MD5",
	}

	sign := GenerateEpaySign(params, config.BusinessKey)
	params["sign"] = sign

	query := encodeEpayParams(params)
	return fmt.Sprintf("%s?%s", requestURL, query), params, nil
}

func parseSQLTime(raw string) (*time.Time, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil, nil
	}

	if value == "0000-00-00 00:00:00" {
		return nil, nil
	}

	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05.999999999",
		"2006-01-02 15:04:05.999999",
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05.999999999Z07:00",
		"2006-01-02T15:04:05.999999Z07:00",
		"2006-01-02T15:04:05Z07:00",
	}

	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return &t, nil
		}
	}

	return nil, fmt.Errorf("unsupported time format: %s", value)
}
