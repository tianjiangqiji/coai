package coze

import (
	"chat/globals"
	"chat/utils"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

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

func processChatStreamData(data string) *ChatStreamData {
	if form := utils.UnmarshalForm[ChatStreamData](data); form != nil {
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

func processSSEData(data string) (event string, eventData string, err error) {
	if data == "" {
		return "", "", nil
	}

	sseLines := strings.Split(data, "\n")
	for _, line := range sseLines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "event:") {
			event = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
		} else if strings.HasPrefix(line, "data:") {
			eventData = strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		}
	}

	if eventData == "" {
		return "", "", nil
	}

	if strings.HasPrefix(eventData, "\"") && strings.HasSuffix(eventData, "\"") && len(eventData) > 2 {
		unquoted, err := strconv.Unquote(eventData)
		if err == nil {
			eventData = unquoted
		}
	}

	return event, eventData, nil
}

func processEventContent(event string, eventData string) (content string, complete bool, err error) {
	switch event {
	case "conversation.message.delta":
		content, _ := parseEventContent(event, eventData)
		if content != "" {
			return content, false, nil
		}

		streamData := processChatStreamData(eventData)
		if streamData != nil && streamData.Type == "answer" && streamData.Role == "assistant" && streamData.Content != "" {
			return streamData.Content, false, nil
		}
	case "conversation.message.completed":
		return "", false, nil
	case "conversation.chat.completed":
		return "", true, nil
	case "conversation.chat.failed":
		streamData := processChatStreamData(eventData)
		if streamData != nil {
			if streamData.Code != 0 && streamData.Msg != "" {
				return "", false, errors.New(fmt.Sprintf("coze error: %s (code: %d)", streamData.Msg, streamData.Code))
			}
		}
		return "", false, errors.New("coze error: conversation failed")
	case "done":
		return "", true, nil
	}

	errorResp := processChatErrorResponse(eventData)
	if errorResp != nil && errorResp.Data.Code != 0 {
		return "", false, errors.New(fmt.Sprintf("coze error: %s (code: %d)", errorResp.Data.Msg, errorResp.Data.Code))
	}

	streamData := processChatStreamData(eventData)
	if streamData != nil {
		if streamData.Code != 0 && streamData.Msg != "" {
			return "", false, errors.New(fmt.Sprintf("coze error: %s (code: %d)", streamData.Msg, streamData.Code))
		}

		if streamData.LastError.Code != 0 && streamData.LastError.Msg != "" {
			return "", false, errors.New(fmt.Sprintf("coze error: %s (code: %d)", streamData.LastError.Msg, streamData.LastError.Code))
		}
	}

	return "", false, nil
}

func parseEventContent(eventType string, eventData string) (string, error) {
	if eventType == "conversation.message.delta" {
		streamResp := processChatStreamResponse(fmt.Sprintf(`{"event":"%s","data":%s}`, eventType, eventData))
		if streamResp != nil {
			streamData := processChatStreamData(streamResp.Data)
			if streamData != nil && streamData.Type == "answer" && streamData.Role == "assistant" && streamData.Content != "" {
				return streamData.Content, nil
			}
		}
	}
	return "", nil
}

func processStreamResponse(data string) (*globals.Chunk, bool, error) {
	event, eventData, err := processSSEData(data)
	if err != nil {
		return nil, false, err
	}

	if event == "" || eventData == "" {
		return &globals.Chunk{Content: ""}, false, nil
	}

	content, complete, err := processEventContent(event, eventData)
	if err != nil {
		return nil, false, err
	}

	return &globals.Chunk{
		Content: content,
	}, complete, nil
}
