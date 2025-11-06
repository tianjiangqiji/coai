package auth

import (
	"chat/globals"
	"chat/utils"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type CreateEpayOrderForm struct {
	Amount    float64 `json:"amount" binding:"required"`
	Method    string  `json:"method"`
	ReturnURL string  `json:"return_url"`
	Device    string  `json:"device"`
}

func GetEpayInfoAPI(c *gin.Context) {
	if RequireAuth(c) == nil {
		return
	}

	conf := globals.PaymentEpay
	minAmount := conf.MinAmount
	if minAmount <= 0 {
		minAmount = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"status":      true,
		"enabled":     conf.Enabled,
		"minamount":   minAmount,
		"methods":     conf.Methods,
		"aggregation": conf.Aggregation,
	})
}

func CreateEpayOrderAPI(c *gin.Context) {
	user := RequireAuth(c)
	if user == nil {
		return
	}

	var form CreateEpayOrderForm
	if err := c.ShouldBindJSON(&form); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"status": false,
			"error":  err.Error(),
		})
		return
	}

	config := globals.PaymentEpay
	if !config.Enabled {
		c.JSON(http.StatusOK, gin.H{
			"status": false,
			"error":  "EasyPay is not enabled",
		})
		return
	}

	minAmount := config.MinAmount
	if minAmount <= 0 {
		minAmount = 1
	}

	if math.IsNaN(form.Amount) || math.IsInf(form.Amount, 0) {
		c.JSON(http.StatusOK, gin.H{
			"status": false,
			"error":  "invalid amount",
		})
		return
	}

	amount := math.Round(form.Amount*100) / 100

	if amount < minAmount {
		c.JSON(http.StatusOK, gin.H{
			"status": false,
			"error":  fmt.Sprintf("amount should be >= %.2f", minAmount),
		})
		return
	}

	method := strings.TrimSpace(form.Method)
	device := strings.TrimSpace(strings.ToLower(form.Device))
	allowed := map[string]bool{}
	for _, item := range config.Methods {
		allowed[strings.ToLower(strings.TrimSpace(item))] = true
	}

	if config.Aggregation {
		method = "jump"
	} else {
		if method == "" || !allowed[strings.ToLower(method)] {
			switch device {
			case "wechat":
				if allowed["wxpay"] {
					method = "wxpay"
				}
			case "alipay":
				if allowed["alipay"] {
					method = "alipay"
				}
			}
		}

		if method == "" {
			if allowed["alipay"] {
				method = "alipay"
			} else if len(config.Methods) > 0 {
				method = strings.TrimSpace(config.Methods[0])
			} else {
				method = "alipay"
			}
		}
	}

	method = strings.ToLower(method)

	notifyURL := strings.TrimSpace(config.CallbackURL)
	if notifyURL == "" {
		c.JSON(http.StatusOK, gin.H{
			"status": false,
			"error":  "callback url is not configured",
		})
		return
	}

	returnURL := strings.TrimSpace(form.ReturnURL)
	if returnURL == "" {
		returnURL = notifyURL
	}

	db := utils.GetDBFromContext(c)
	order, err := createEpayOrder(db, user, amount, method, returnURL)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"status": false,
			"error":  err.Error(),
		})
		return
	}

	if err := createUsageLog(db, &usageLog{
		UserID:      order.UserID,
		Type:        "payment",
		Amount:      float32(order.Amount),
		QuotaChange: 0,
		Detail:      fmt.Sprintf("epay order created: %s (%s)", order.OrderNo, method),
	}); err != nil {
		globals.Warn(fmt.Sprintf("[payment] failed to log payment creation: %s", err))
	}

	payURL, _, err := buildEpayPaymentURL(order, notifyURL, returnURL, method)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"status": false,
			"error":  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    true,
		"pay_url":   payURL,
		"order_no":  order.OrderNo,
		"amount":    order.Amount,
		"method":    order.Method,
		"min_ratio": globals.PaymentQuotaRatio,
	})
}

func GetEpayOrderStatusAPI(c *gin.Context) {
	user := RequireAuth(c)
	if user == nil {
		return
	}

	orderNo := strings.TrimSpace(c.Param("order"))
	if orderNo == "" {
		c.JSON(http.StatusOK, gin.H{
			"status": false,
			"error":  "order not found",
		})
		return
	}

	db := utils.GetDBFromContext(c)
	order, err := getEpayOrderByOrderNo(db, orderNo)
	if err != nil || order.UserID != user.GetID(db) {
		c.JSON(http.StatusOK, gin.H{
			"status": false,
			"error":  "order not found",
		})
		return
	}

	var paidAt string
	if order.PaidAt != nil {
		paidAt = order.PaidAt.Format(time.RFC3339)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":       true,
		"order_status": order.Status,
		"trade_no":     order.TradeNo,
		"paid_at":      paidAt,
	})
}

func EpayNotifyAPI(c *gin.Context) {
	conf := globals.PaymentEpay
	if !conf.Enabled {
		c.String(http.StatusOK, "disabled")
		return
	}

	if err := c.Request.ParseForm(); err != nil {
		globals.Warn(fmt.Sprintf("[payment] epay notify parse form failed: %v", err))
		c.String(http.StatusOK, "fail")
		return
	}

	params := map[string]string{}
	for key := range c.Request.Form {
		params[key] = c.Request.Form.Get(key)
	}

	maskParams := func() map[string]string {
		snapshot := make(map[string]string, len(params))
		for k, v := range params {
			if k == "sign" && len(v) > 8 {
				snapshot[k] = fmt.Sprintf("%s***", v[:8])
				continue
			}
			snapshot[k] = v
		}
		return snapshot
	}

	orderNo := strings.TrimSpace(params["out_trade_no"])
	sign := strings.TrimSpace(params["sign"])
	if sign == "" {
		globals.Warn(fmt.Sprintf("[payment] epay notify missing sign, order=%s, params=%v", orderNo, maskParams()))
		c.String(http.StatusOK, "fail")
		return
	}

	if !VerifyEpaySign(params, conf.BusinessKey, params["sign"]) {
		globals.Warn(fmt.Sprintf("[payment] epay notify invalid sign, order=%s, params=%v", orderNo, maskParams()))
		c.String(http.StatusOK, "fail")
		return
	}

	pid := strings.TrimSpace(params["pid"])
	if conf.BusinessID != "" && !strings.EqualFold(pid, conf.BusinessID) {
		globals.Warn(fmt.Sprintf("[payment] epay notify merchant mismatch, order=%s, expect=%s, got=%s, params=%v", orderNo, conf.BusinessID, pid, maskParams()))
		c.String(http.StatusOK, "fail")
		return
	}

	status := strings.TrimSpace(params["trade_status"])
	if !strings.EqualFold(status, "TRADE_SUCCESS") {
		globals.Warn(fmt.Sprintf("[payment] epay notify unexpected trade status, order=%s, status=%s, params=%v", orderNo, status, maskParams()))
		c.String(http.StatusOK, "fail")
		return
	}

	db := utils.GetDBFromContext(c)
	cache := utils.GetCacheFromContext(c)

	order, err := getEpayOrderByOrderNo(db, orderNo)
	if err != nil {
		globals.Warn(fmt.Sprintf("[payment] epay notify failed to fetch order, order=%s, err=%v, params=%v", orderNo, err, maskParams()))
		c.String(http.StatusOK, "fail")
		return
	}

	moneyStr := strings.TrimSpace(params["money"])
	money, err := strconv.ParseFloat(moneyStr, 64)
	if err != nil {
		globals.Warn(fmt.Sprintf("[payment] epay notify money parse failed, order=%s, value=%s, err=%v, params=%v", orderNo, moneyStr, err, maskParams()))
		c.String(http.StatusOK, "fail")
		return
	}

	if math.Abs(order.Amount-money) > 0.01 {
		globals.Warn(fmt.Sprintf("[payment] order %s amount mismatch: expect %.2f, got %.2f", orderNo, order.Amount, money))
		c.String(http.StatusOK, "fail")
		return
	}

	tradeNo := strings.TrimSpace(params["trade_no"])
	updated, err := markEpayOrderPaid(db, order, tradeNo)
	if err != nil {
		globals.Warn(fmt.Sprintf("[payment] failed to update order %s: %s", orderNo, err))
		c.String(http.StatusOK, "fail")
		return
	}

	if updated {
		user := GetUserById(db, order.UserID)
		if user == nil {
			globals.Warn(fmt.Sprintf("[payment] cannot find user %d for order %s", order.UserID, orderNo))
		} else {
			if user.IncreaseQuota(db, float32(order.Quota)) {
				if err := createUsageLog(db, &usageLog{
					UserID:      order.UserID,
					Type:        "recharge",
					Amount:      float32(order.Amount),
					QuotaChange: float32(order.Quota),
					Detail:      fmt.Sprintf("epay order success: %s", tradeNo),
				}); err != nil {
					globals.Warn(fmt.Sprintf("[payment] failed to log recharge for order %s: %s", orderNo, err))
				}

				incrBillingRequest(cache, int64(math.Round(order.Amount*100)))
			} else {
				globals.Warn(fmt.Sprintf("[payment] failed to increase quota for user %d, order %s", order.UserID, orderNo))
			}
		}
	} else {
		globals.Info(fmt.Sprintf("[payment] epay notify received duplicate callback, order=%s", orderNo))
	}

	c.String(http.StatusOK, "success")
}
