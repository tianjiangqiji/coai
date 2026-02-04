package openai

import (
	adaptercommon "chat/adapter/common"
	"chat/globals"
	"chat/utils"
	"errors"
	"fmt"
	"regexp"
)

func formatMessages(props *adaptercommon.ChatProps) interface{} {
	isVision := globals.IsVisionModel(props.Model)

	return utils.Each[globals.Message, Message](props.Message, func(message globals.Message) Message {
		if message.Role == globals.User {
			// 1. 先提取文件块内容
			content, files := utils.ExtractFiles(message.Content)

			// 2. 再提取图片内容 (非视觉模型不提取 Base64 以免误删内容，但仍提取外部链接)
			content, urls := utils.ExtractImages(content, isVision)

			// 3. 构建多内容数组
			var contents MessageContents

			// 注入主文本内容
			if len(content) > 0 {
				contents = append(contents, MessageContent{
					Type: "text",
					Text: &content,
				})
			}

			// 注入提取出来的文件块作为独立文本块
			for _, file := range files {
				contents = append(contents, MessageContent{
					Type: "text",
					Text: &file,
				})
			}

			// 注入图片内容 (仅视觉模型)
			if isVision {
				for _, url := range urls {
					obj, err := utils.NewImage(url)
					if err != nil {
						globals.Info(fmt.Sprintf("cannot process image: %s (source: %s)", err.Error(), utils.Extract(url, 24, "...")))
						continue
					}
					props.Buffer.AddImage(obj)

					contents = append(contents, MessageContent{
						Type: "image_url",
						ImageUrl: &ImageUrl{
							Url: url,
						},
					})
				}
			} else if len(urls) > 0 {
				// 非视觉模型，如果存在外部图片链接，将其作为普通文本放回
				for _, url := range urls {
					contents = append(contents, MessageContent{
						Type: "text",
						Text: &url,
					})
				}
			}

			return Message{
				Role:         message.Role,
				Content:      contents,
				Name:         message.Name,
				FunctionCall: message.FunctionCall,
				ToolCalls:    message.ToolCalls,
				ToolCallId:   message.ToolCallId,
			}
		}

		return Message{
			Role: message.Role,
			Content: MessageContents{
				MessageContent{
					Type: "text",
					Text: &message.Content,
				},
			},
			Name:         message.Name,
			FunctionCall: message.FunctionCall,
			ToolCalls:    message.ToolCalls,
			ToolCallId:   message.ToolCallId,
		}
	})
}

func processChatResponse(data string) *ChatStreamResponse {
	return utils.UnmarshalForm[ChatStreamResponse](data)
}

func processCompletionResponse(data string) *CompletionResponse {
	return utils.UnmarshalForm[CompletionResponse](data)
}

func processChatErrorResponse(data string) *ChatStreamErrorResponse {
	return utils.UnmarshalForm[ChatStreamErrorResponse](data)
}

func getChoices(form *ChatStreamResponse) (*globals.Chunk, error) {
	if len(form.Choices) == 0 {
		return &globals.Chunk{Content: ""}, nil
	}

	choice := form.Choices[0]

	// detect reasoning model exhausted tokens: finish_reason is "length" but content is empty
	// this happens when the model uses all max_completion_tokens for reasoning
	if choice.FinishReason == "length" && choice.Delta.Content == "" &&
		choice.Delta.ToolCalls == nil && choice.Delta.FunctionCall == nil {
		return nil, errors.New("reasoning model exhausted token limit during thinking phase, please increase max_tokens setting")
	}

	return &globals.Chunk{
		Content:      choice.Delta.Content,
		ToolCall:     choice.Delta.ToolCalls,
		FunctionCall: choice.Delta.FunctionCall,
	}, nil
}

func getCompletionChoices(form *CompletionResponse) string {
	if len(form.Choices) == 0 {
		return ""
	}

	return form.Choices[0].Text
}

func getRobustnessResult(chunk string) string {
	exp := `\"content\":\"(.*?)\"`
	compile, err := regexp.Compile(exp)
	if err != nil {
		return ""
	}

	matches := compile.FindStringSubmatch(chunk)
	if len(matches) > 1 {
		return utils.ProcessRobustnessChar(matches[1])
	} else {
		return ""
	}
}

func (c *ChatInstance) ProcessLine(data string, isCompletionType bool) (*globals.Chunk, error) {
	if isCompletionType {
		// openai legacy support
		if completion := processCompletionResponse(data); completion != nil {
			return &globals.Chunk{
				Content: getCompletionChoices(completion),
			}, nil
		}

		globals.Warn(fmt.Sprintf("openai error: cannot parse completion response: %s", utils.TruncateLog(data)))
		return &globals.Chunk{Content: ""}, errors.New("parser error: cannot parse completion response")
	}

	if form := processChatResponse(data); form != nil {
		chunk, err := getChoices(form)
		if err != nil {
			return nil, err
		}
		return chunk, nil
	}

	if form := processChatErrorResponse(data); form != nil {
		return &globals.Chunk{Content: ""}, fmt.Errorf("openai error: %s (type: %s)", form.Error.Message, form.Error.Type)
	}

	globals.Warn(fmt.Sprintf("openai error: cannot parse chat completion response: %s", utils.TruncateLog(data)))
	return &globals.Chunk{Content: ""}, errors.New("parser error: cannot parse chat completion response")
}
