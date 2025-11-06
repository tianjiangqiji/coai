package dify

import (
	adaptercommon "chat/adapter/common"
	"chat/globals"
	"chat/utils"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

type ChatInstance struct {
	Endpoint         string
	ApiKey           string
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
		Endpoint: endpoint,
		ApiKey:   apiKey,
	}
}

func NewChatInstanceFromConfig(conf globals.ChannelConfig) adaptercommon.Factory {
	return NewChatInstance(
		conf.GetEndpoint(),
		conf.GetRandomSecret(),
	)
}

func (c *ChatInstance) GetChatEndpoint() string {
	return fmt.Sprintf("%s/chat-messages", c.GetEndpoint())
}

func (c *ChatInstance) GetChatBody(props *adaptercommon.ChatProps, stream bool) interface{} {
	timestamp := time.Now().UnixNano()
	userID := fmt.Sprintf("user_%d", timestamp)

	query := ""
	for _, msg := range props.Message {
		if msg.Role == "user" {
			query = msg.Content
			break
		}
	}

	return ChatRequest{
		Inputs:           map[string]interface{}{},
		Query:            query,
		ResponseMode:     "streaming",
		User:             userID,
		AutoGenerateName: true,
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
	res, err := utils.Post(
		c.GetChatEndpoint(),
		c.GetHeader(),
		c.GetChatBody(props, false),
		props.Proxy,
	)

	if err != nil || res == nil {
		return "", fmt.Errorf("dify error: %s", err.Error())
	}

	responseBody := utils.Marshal(res)
	response := processChatResponse(responseBody)
	if response == nil {
		return "", fmt.Errorf("dify error: cannot parse response")
	}

	return response.Answer, nil
}

func (c *ChatInstance) CreateStreamChatRequest(props *adaptercommon.ChatProps, callback globals.Hook) error {
	c.responseComplete = false

	err := utils.EventScanner(&utils.EventScannerProps{
		Method:  "POST",
		Uri:     c.GetChatEndpoint(),
		Headers: c.GetHeader(),
		Body:    c.GetChatBody(props, true),
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
			if errorResp != nil {
				return errors.New(fmt.Sprintf("dify error: %s (code: %s)", errorResp.Message, errorResp.Code))
			}

			var genericResp map[string]interface{}
			if jsonErr := json.Unmarshal([]byte(err.Body), &genericResp); jsonErr == nil {
				errMsg, _ := json.Marshal(genericResp)
				return errors.New(fmt.Sprintf("dify error: %s", string(errMsg)))
			}
		}

		if err.Error != nil {
			return err.Error
		}
		return errors.New(fmt.Sprintf("dify error: unexpected error in stream request"))
	}

	return nil
}
