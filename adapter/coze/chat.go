package coze

import (
	adaptercommon "chat/adapter/common"
	"chat/globals"
	"chat/utils"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
)

type ChatInstance struct {
	Endpoint         string
	ApiKey           string
	AutoSaveHistory  bool
	responseComplete bool
}

func (c *ChatInstance) GetEndpoint() string {
	return c.Endpoint
}

func (c *ChatInstance) GetApiKey() string {
	return c.ApiKey
}

func (c *ChatInstance) GetHeader() map[string]string {
	return map[string]string{
		"Content-Type":  "application/json",
		"Authorization": fmt.Sprintf("Bearer %s", c.GetApiKey()),
	}
}

func NewChatInstance(endpoint, apiKey string) *ChatInstance {
	return &ChatInstance{
		Endpoint:        endpoint,
		ApiKey:          apiKey,
		AutoSaveHistory: false,
	}
}

func NewChatInstanceFromConfig(conf globals.ChannelConfig) adaptercommon.Factory {
	return NewChatInstance(
		conf.GetEndpoint(),
		conf.GetRandomSecret(),
	)
}

func (c *ChatInstance) GetChatEndpoint() string {
	return fmt.Sprintf("%s/v3/chat", c.GetEndpoint())
}

func (c *ChatInstance) GetChatBody(props *adaptercommon.ChatProps, stream bool) interface{} {
	additionalMessages := []EnterMessage{}

	for _, msg := range props.Message {
		enterMsg := EnterMessage{
			Role:        msg.Role,
			Content:     msg.Content,
			ContentType: "text",
		}

		if msg.Role == "user" {
			enterMsg.Type = "question"
		} else if msg.Role == "assistant" {
			enterMsg.Type = "answer"
		}

		additionalMessages = append(additionalMessages, enterMsg)
	}

	// `user_id` is required in coze
	timestamp := time.Now().UnixNano()
	userID := fmt.Sprintf("user_%d", timestamp)

	return ChatRequest{
		BotID:              props.Model,
		UserID:             userID,
		AdditionalMessages: additionalMessages,
		Stream:             stream,
		AutoSaveHistory:    c.AutoSaveHistory,
	}
}

func (c *ChatInstance) ProcessLine(data string) (string, error) {
	if c.responseComplete {
		return "", nil
	}

	if data == "" {
		return "", nil
	}

	chunk, complete, err := processStreamResponse(data)
	if err != nil {
		return "", err
	}

	if complete {
		c.responseComplete = true
	}

	return chunk.Content, nil
}

func (c *ChatInstance) CreateChatRequest(props *adaptercommon.ChatProps) (string, error) {
	// TODO: use standard non-stream request
	c.AutoSaveHistory = true

	res, err := utils.Post(
		c.GetChatEndpoint(),
		c.GetHeader(),
		c.GetChatBody(props, false),
		props.Proxy,
	)

	if err != nil || res == nil {
		return "", fmt.Errorf("coze error: %s", err.Error())
	}

	responseBody := utils.Marshal(res)
	response := processChatResponse(responseBody)
	if response == nil {
		return "", fmt.Errorf("coze error: cannot parse response")
	}

	if response.Code != 0 {
		return "", fmt.Errorf("coze error: %s (code: %d)", response.Msg, response.Code)
	}

	var responseContent string
	var responseMutex sync.Mutex

	err = c.CreateStreamChatRequest(props, func(chunk *globals.Chunk) error {
		responseMutex.Lock()
		defer responseMutex.Unlock()
		responseContent += chunk.Content
		return nil
	})

	if err != nil {
		return "", err
	}

	if responseContent == "" {
		return "", fmt.Errorf("coze error: empty response from API")
	}

	return responseContent, nil
}

func (c *ChatInstance) CreateStreamChatRequest(props *adaptercommon.ChatProps, callback globals.Hook) error {
	c.responseComplete = false
	c.AutoSaveHistory = false

	err := utils.EventScanner(&utils.EventScannerProps{
		Method:  "POST",
		Uri:     c.GetChatEndpoint(),
		Headers: c.GetHeader(),
		Body:    c.GetChatBody(props, true),
		FullSSE: true,
		Callback: func(data string) error {
			partial, err := c.ProcessLine(data)
			if err != nil {
				return err
			}

			if partial != "" {
				err = callback(&globals.Chunk{Content: partial})
				if err != nil {
					return err
				}
			}
			return nil
		},
	}, props.Proxy)

	c.responseComplete = true

	if err != nil {
		if strings.Contains(err.Body, "\"code\":") {
			errorResp := processChatErrorResponse(err.Body)
			if errorResp != nil && errorResp.Data.Code != 0 {
				return errors.New(fmt.Sprintf("coze error: %s (code: %d)", errorResp.Data.Msg, errorResp.Data.Code))
			}

			var genericResp map[string]interface{}
			if jsonErr := json.Unmarshal([]byte(err.Body), &genericResp); jsonErr == nil {
				errMsg, _ := json.Marshal(genericResp)
				return errors.New(fmt.Sprintf("coze error: %s", string(errMsg)))
			}
		}

		if err.Error != nil {
			return err.Error
		}
		return errors.New(fmt.Sprintf("coze error: unexpected error in stream request"))
	}

	return nil
}
