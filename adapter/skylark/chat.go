package skylark

import (
	adaptercommon "chat/adapter/common"
	"chat/globals"
	"chat/utils"
	"context"
	"fmt"
	"io"

	"github.com/volcengine/volcengine-go-sdk/service/arkruntime/model"
	"github.com/volcengine/volcengine-go-sdk/volcengine"
)

const defaultMaxTokens int = 4096

func getMessages(messages []globals.Message) []*model.ChatCompletionMessage {
	result := make([]*model.ChatCompletionMessage, 0)

	for _, message := range messages {
		if message.Role == globals.Tool {
			message.Role = model.ChatMessageRoleTool
		}

		msg := &model.ChatCompletionMessage{
			Role:             message.Role,
			Content:          &model.ChatCompletionMessageContent{StringValue: volcengine.String(message.Content)},
			FunctionCall:     getFunctionCall(message.ToolCalls),
			ReasoningContent: message.ReasoningContent,
		}

		hasPrevious := len(result) > 0

		//  a message should not followed by the same role message, merge them
		if hasPrevious && result[len(result)-1].Role == message.Role {
			prev := result[len(result)-1]
			prev.Content.StringValue = volcengine.String(*prev.Content.StringValue + *msg.Content.StringValue)
			if message.ToolCalls != nil {
				prev.FunctionCall = msg.FunctionCall
			}

			continue
		}

		// `assistant` message should follow a user or function message, if not has previous message, change the role to `user`
		if !hasPrevious && message.Role == model.ChatMessageRoleAssistant {
			msg.Role = model.ChatMessageRoleUser
		}

		result = append(result, msg)
	}

	return result
}

func (c *ChatInstance) GetMaxTokens(token *int) int {
	if token == nil || *token < 0 {
		return defaultMaxTokens
	}

	return *token
}

func (c *ChatInstance) CreateRequest(props *adaptercommon.ChatProps) *model.ChatCompletionRequest {
	return &model.ChatCompletionRequest{
		Model:       props.Model,
		Messages:    getMessages(props.Message),
		Temperature: utils.GetPtrVal(props.Temperature, 0.),
		TopP:        utils.GetPtrVal(props.TopP, 0.),
		// skylark v3 not support TopK
		PresencePenalty:   utils.GetPtrVal(props.PresencePenalty, 0.),
		FrequencyPenalty:  utils.GetPtrVal(props.FrequencyPenalty, 0.),
		RepetitionPenalty: utils.GetPtrVal(props.RepetitionPenalty, 0.),
		MaxTokens:         c.GetMaxTokens(props.MaxTokens),
		FunctionCall:      getFunctions(props.Tools),
	}
}

func getToolCalls(id string, choiceDelta model.ChatCompletionStreamChoiceDelta) *globals.ToolCalls {
	calls := choiceDelta.FunctionCall
	if calls == nil {
		return nil
	}

	return &globals.ToolCalls{
		globals.ToolCall{
			Type: "function",
			Id:   fmt.Sprintf("%s-%s", calls.Name, id),
			Function: globals.ToolCallFunction{
				Name:      calls.Name,
				Arguments: calls.Arguments,
			},
		},
	}
}

func getChoice(choice model.ChatCompletionStreamResponse) *globals.Chunk {
	if len(choice.Choices) == 0 {
		return &globals.Chunk{Content: ""}
	}

	message := choice.Choices[0].Delta
	return &globals.Chunk{
		Content:  message.Content,
		ToolCall: getToolCalls(choice.ID, message),
	}
}

func (c *ChatInstance) CreateStreamChatRequest(props *adaptercommon.ChatProps, callback globals.Hook) error {
	req := c.CreateRequest(props)
	c.isFirstReasoning = true
	c.isReasonOver = false

	if globals.DebugMode {
		globals.Debug(fmt.Sprintf("[skylark] request: %v", utils.Marshal(req)))
	}

	stream, err := c.Instance.CreateChatCompletionStream(context.Background(), req)
	if err != nil {
		if globals.DebugMode {
			globals.Debug(fmt.Sprintf("[skylark] stream error: %v", err))
		}
		return err
	}
	defer stream.Close()

	for {
		recv, err2 := stream.Recv()
		if err2 == io.EOF {
			return nil
		}
		if err2 != nil {
			if globals.DebugMode {
				globals.Debug(fmt.Sprintf("[skylark] receive error: %v", err2))
			}
			return err2
		}

		if globals.DebugMode {
			globals.Debug(fmt.Sprintf("[skylark] response: %v", utils.Marshal(recv)))
		}

		choice := getChoice(recv)
		if len(recv.Choices) > 0 {
			delta := recv.Choices[0].Delta

			// Handle reasoning content
			if c.isFirstReasoning == false && !c.isReasonOver && delta.ReasoningContent == nil {
				c.isReasonOver = true
				if delta.Content != "" {
					choice.Content = fmt.Sprintf("\n</think>\n\n%s", delta.Content)
				} else {
					choice.Content = "\n</think>\n\n"
				}
			}

			if delta.ReasoningContent != nil {
				if c.isFirstReasoning {
					c.isFirstReasoning = false
					choice.Content = fmt.Sprintf("<think>\n%s", *delta.ReasoningContent)
				} else {
					choice.Content = *delta.ReasoningContent
				}
			}
		}

		if err = callback(choice); err != nil {
			return err
		}
	}
	return nil
}
