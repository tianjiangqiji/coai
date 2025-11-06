package auth

import (
	"crypto/md5"
	"fmt"
	"net/url"
	"sort"
	"strings"
)

func GenerateEpaySign(params map[string]string, key string) string {
	if params == nil {
		return ""
	}

	keys := make([]string, 0, len(params))
	for k := range params {
		if k == "sign" || k == "sign_type" {
			continue
		}
		if strings.TrimSpace(params[k]) == "" {
			continue
		}
		keys = append(keys, k)
	}
	sort.Strings(keys)

	builder := strings.Builder{}
	for i, k := range keys {
		if i > 0 {
			builder.WriteString("&")
		}
		builder.WriteString(k)
		builder.WriteString("=")
		builder.WriteString(params[k])
	}
	builder.WriteString(key)

	sum := md5.Sum([]byte(builder.String()))
	return fmt.Sprintf("%x", sum)
}

func encodeEpayParams(params map[string]string) string {
	if params == nil {
		return ""
	}

	keys := make([]string, 0, len(params))
	for k := range params {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	query := strings.Builder{}
	for i, k := range keys {
		if i > 0 {
			query.WriteString("&")
		}
		query.WriteString(url.QueryEscape(k))
		query.WriteString("=")
		query.WriteString(url.QueryEscape(params[k]))
	}
	return query.String()
}

func VerifyEpaySign(params map[string]string, key, expected string) bool {
	if len(strings.TrimSpace(expected)) == 0 {
		return false
	}
	sign := GenerateEpaySign(params, key)
	return strings.EqualFold(sign, expected)
}
