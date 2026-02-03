package adaptercommon

import (
	"chat/globals"
	"chat/utils"
)

type RequestProps struct {
	MaxRetries *int                `json:"-"`
	Current    int                 `json:"-"`
	Group      string              `json:"-"`
	Proxy      globals.ProxyConfig `json:"-"`
}

type VideoProps struct {
	RequestProps

	Model         string `json:"model,omitempty"`
	OriginalModel string `json:"-"`

	Prompt         string  `json:"prompt"`
	Seconds        *string `json:"seconds,omitempty"`
	Size           *string `json:"size,omitempty"`
	InputReference *string `json:"input_reference,omitempty"`

	User string `json:"-"`
}

type ChatProps struct {
	RequestProps

	Model         string `json:"model,omitempty"`
	OriginalModel string `json:"-"`

	Message           []globals.Message      `json:"messages,omitempty"`
	MaxTokens         *int                   `json:"max_tokens,omitempty"`
	PresencePenalty   *float32               `json:"presence_penalty,omitempty"`
	FrequencyPenalty  *float32               `json:"frequency_penalty,omitempty"`
	RepetitionPenalty *float32               `json:"repetition_penalty,omitempty"`
	Temperature       *float32               `json:"temperature,omitempty"`
	TopP              *float32               `json:"top_p,omitempty"`
	TopK              *int                   `json:"top_k,omitempty"`
	Tools             *globals.FunctionTools `json:"tools,omitempty"`
	ToolChoice        *interface{}           `json:"tool_choice,omitempty"`
	Buffer            *utils.Buffer          `json:"-"`
	Think             *bool                  `json:"-"`
	ExtraBody         map[string]interface{} `json:"-"`
}

func (c *ChatProps) SetupBuffer(buf *utils.Buffer) {
	buf.SetPrompts(c)
	c.Buffer = buf
}

func CreateChatProps(props *ChatProps, buffer *utils.Buffer) *ChatProps {
	props.SetupBuffer(buffer)
	return props
}

func CreateVideoProps(props *VideoProps) *VideoProps {
	return props
}
