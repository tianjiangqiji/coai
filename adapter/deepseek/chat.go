package deepseek

import (
	adaptercommon "chat/adapter/common"
	"chat/globals"
	"chat/utils"
	"errors"
	"fmt"
)

type ChatInstance struct {
	Endpoint         string
	ApiKey           string
	isFirstReasoning bool
	isReasonOver     bool
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
		Endpoint:         endpoint,
		ApiKey:           apiKey,
		isFirstReasoning: true,
	}
}

func NewChatInstanceFromConfig(conf globals.ChannelConfig) adaptercommon.Factory {
	return NewChatInstance(
		conf.GetEndpoint(),
		conf.GetRandomSecret(),
	)
}

func (c *ChatInstance) GetChatEndpoint() string {
	return fmt.Sprintf("%s/chat/completions", c.GetEndpoint())
}

func (c *ChatInstance) GetChatBody(props *adaptercommon.ChatProps, stream bool) interface{} {
	messages := props.Message
	// because of deepseek first message must be user role
	// convert assistant message to user message
	if len(messages) > 0 && messages[0].Role == globals.Assistant {
		messages = make([]globals.Message, len(props.Message))
		copy(messages, props.Message)
		messages[0].Role = globals.User
	}

	return ChatRequest{
		Model:            props.Model,
		Messages:         messages,
		MaxTokens:        props.MaxTokens,
		Stream:           stream,
		Temperature:      props.Temperature,
		TopP:             props.TopP,
		PresencePenalty:  props.PresencePenalty,
		FrequencyPenalty: props.FrequencyPenalty,
	}
}

func processChatResponse(data string) *ChatResponse {
	if form := utils.UnmarshalForm[ChatResponse](data); form != nil {
		return form
	}
	return nil
}

func processChatStreamResponse(data string) *ChatStreamResponse {
	if form := utils.UnmarshalForm[ChatStreamResponse](data); form != nil {
		return form
	}
	return nil
}

func processChatErrorResponse(data string) *ChatStreamErrorResponse {
	if form := utils.UnmarshalForm[ChatStreamErrorResponse](data); form != nil {
		return form
	}
	return nil
}

func (c *ChatInstance) ProcessLine(data string) (string, error) {
	if form := processChatStreamResponse(data); form != nil {
		if len(form.Choices) == 0 {
			return "", nil
		}

		delta := form.Choices[0].Delta

		if c.isFirstReasoning == false && !c.isReasonOver && delta.ReasoningContent == nil {
			c.isReasonOver = true
			if delta.Content != "" {
				return fmt.Sprintf("\n</think>\n\n%s", delta.Content), nil
			}
			return "\n</think>\n\n", nil
		}

		if delta.ReasoningContent != nil {
			content := *delta.ReasoningContent
			if c.isFirstReasoning {
				c.isFirstReasoning = false
				return fmt.Sprintf("<think>\n%s", content), nil
			}
			return content, nil
		}

		return delta.Content, nil
	}

	if form := processChatErrorResponse(data); form != nil {
		if form.Error.Message != "" {
			return "", errors.New(fmt.Sprintf("deepseek error: %s", form.Error.Message))
		}
	}

	return "", nil
}

func (c *ChatInstance) CreateChatRequest(props *adaptercommon.ChatProps) (string, error) {
	res, err := utils.Post(
		c.GetChatEndpoint(),
		c.GetHeader(),
		c.GetChatBody(props, false),
		props.Proxy,
	)

	if err != nil || res == nil {
		return "", fmt.Errorf("deepseek error: %s", err.Error())
	}

	data := utils.MapToStruct[ChatResponse](res)
	if data == nil {
		return "", fmt.Errorf("deepseek error: cannot parse response")
	}

	if len(data.Choices) == 0 {
		return "", fmt.Errorf("deepseek error: no choices")
	}

	message := data.Choices[0].Message
	content := message.Content
	if message.ReasoningContent != nil {
		content = fmt.Sprintf("<think>\n%s\n</think>\n\n%s", *message.ReasoningContent, content)
	}

	return content, nil
}

func (c *ChatInstance) CreateStreamChatRequest(props *adaptercommon.ChatProps, callback globals.Hook) error {
	c.isFirstReasoning = true
	c.isReasonOver = false
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
			return callback(&globals.Chunk{Content: partial})
		},
	}, props.Proxy)

	if err != nil {
		if form := processChatErrorResponse(err.Body); form != nil {
			if form.Error.Type == "" && form.Error.Message == "" {
				return errors.New(utils.ToMarkdownCode("json", err.Body))
			}
			return errors.New(fmt.Sprintf("deepseek error: %s (type: %s)", form.Error.Message, form.Error.Type))
		}
		return err.Error
	}

	return nil
}
