package analysis

import (
	"fmt"
	"time"
)

func getMonth() string {
	date := time.Now()
	return date.Format("2006-01")
}

func getLastMonth() string {
	date := time.Now().AddDate(0, -1, 0)
	return date.Format("2006-01")
}

func getDay() string {
	date := time.Now()
	return date.Format("2006-01-02")
}

func getLastDay() string {
	date := time.Now().AddDate(0, 0, -1)
	return date.Format("2006-01-02")
}

func getDays(n int) []time.Time {
	current := time.Now()
	var days []time.Time
	for i := n; i > 0; i-- {
		days = append(days, current.AddDate(0, 0, -i+1))
	}

	return days
}

func getErrorFormat(t string) string {
	return fmt.Sprintf("nio:err-analysis-%s", t)
}

func getBillingFormat(t string) string {
	return fmt.Sprintf("nio:billing-analysis-%s", t)
}

func getMonthBillingFormat(t string) string {
	return fmt.Sprintf("nio:billing-analysis-%s", t)
}

func getRequestFormat(t string) string {
	return fmt.Sprintf("nio:request-analysis-%s", t)
}

func getModelFormat(t string, model string) string {
	return fmt.Sprintf("nio:model-analysis-%s-%s", model, t)
}

func getTpmFormat(t string, user string) string {
	return fmt.Sprintf("nio:tpm-analysis-%s-%s", user, t)
}

func getRpmFormat(t string, user string) string {
	return fmt.Sprintf("nio:rpm-analysis-%s-%s", user, t)
}
