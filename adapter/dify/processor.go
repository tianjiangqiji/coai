package dify

import (
	"chat/globals"
	"chat/utils"
	"errors"
	"fmt"
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

func processChatErrorResponse(data string) *ChatStreamErrorResponse {
	if form := utils.UnmarshalForm[ChatStreamErrorResponse](data); form != nil {
		return form
	}
	return nil
}

func processStreamResponse(data string) (*globals.Chunk, bool, error) {
	if data == "" {
		return &globals.Chunk{Content: ""}, false, nil
	}

	streamData := processChatStreamResponse(data)
	if streamData == nil {
		return &globals.Chunk{Content: ""}, false, nil
	}

	switch streamData.Event {
	case "message":
		if streamData.Answer != "" {
			return &globals.Chunk{
				Content: streamData.Answer,
			}, false, nil
		}
	case "message_end":
		return &globals.Chunk{
			Content: "",
		}, true, nil
	case "error":
		if streamData.Code != "" && streamData.Message != "" {
			return nil, false, errors.New(fmt.Sprintf("dify error: %s (code: %s)", streamData.Message, streamData.Code))
		}
		return nil, false, errors.New("dify error: conversation failed")
	case "workflow_started", "node_started", "node_finished", "workflow_finished", "iteration_started", "iteration_next", "iteration_finished", "iteration_completed", "parallel_branch_started", "parallel_branch_finished", "ping":
		return &globals.Chunk{Content: ""}, false, nil
	}

	errorResp := processChatErrorResponse(data)
	if errorResp != nil {
		return nil, false, errors.New(fmt.Sprintf("dify error: %s (code: %s)", errorResp.Message, errorResp.Code))
	}

	return &globals.Chunk{Content: ""}, false, nil
}
