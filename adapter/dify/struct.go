package dify

type ChatRequest struct {
	Inputs           map[string]interface{} `json:"inputs"`
	Query            string                 `json:"query"`
	ResponseMode     string                 `json:"response_mode"`
	ConversationID   string                 `json:"conversation_id,omitempty"`
	User             string                 `json:"user"`
	Files            []File                 `json:"files,omitempty"`
	AutoGenerateName bool                   `json:"auto_generate_name,omitempty"`
}

type File struct {
	Type           string `json:"type"`
	TransferMethod string `json:"transfer_method"`
	URL            string `json:"url,omitempty"`
	UploadFileID   string `json:"upload_file_id,omitempty"`
}

type ChatResponse struct {
	MessageID          string                 `json:"message_id"`
	ConversationID     string                 `json:"conversation_id"`
	Mode               string                 `json:"mode"`
	Answer             string                 `json:"answer"`
	Metadata           map[string]interface{} `json:"metadata"`
	Usage              Usage                  `json:"usage"`
	RetrieverResources []RetrieverResource    `json:"retriever_resources"`
	CreatedAt          int64                  `json:"created_at"`
}

type Usage struct {
	TokenCount   int `json:"token_count"`
	OutputTokens int `json:"output_tokens"`
	InputTokens  int `json:"input_tokens"`
}

type RetrieverResource struct {
	SegmentID string `json:"segment_id"`
	Content   string `json:"content"`
	Source    string `json:"source"`
}

type ChatStreamResponse struct {
	Event              string                 `json:"event"`
	TaskID             string                 `json:"task_id"`
	MessageID          string                 `json:"message_id,omitempty"`
	ConversationID     string                 `json:"conversation_id,omitempty"`
	Answer             string                 `json:"answer,omitempty"`
	CreatedAt          int64                  `json:"created_at,omitempty"`
	Metadata           map[string]interface{} `json:"metadata,omitempty"`
	Usage              *Usage                 `json:"usage,omitempty"`
	RetrieverResources []RetrieverResource    `json:"retriever_resources,omitempty"`
	Audio              string                 `json:"audio,omitempty"`
	Status             int                    `json:"status,omitempty"`
	Code               string                 `json:"code,omitempty"`
	Message            string                 `json:"message,omitempty"`
}

type ChatStreamErrorResponse struct {
	Event     string `json:"event"`
	TaskID    string `json:"task_id"`
	MessageID string `json:"message_id"`
	Status    int    `json:"status"`
	Code      string `json:"code"`
	Message   string `json:"message"`
}
