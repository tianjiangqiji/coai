package coze

type ChatRequest struct {
	BotID              string            `json:"bot_id"`
	UserID             string            `json:"user_id"`
	AdditionalMessages []EnterMessage    `json:"additional_messages,omitempty"`
	Stream             bool              `json:"stream"`
	CustomVariables    map[string]string `json:"custom_variables,omitempty"`
	AutoSaveHistory    bool              `json:"auto_save_history"`
	MetaData           map[string]string `json:"meta_data,omitempty"`
	ExtraParams        map[string]string `json:"extra_params,omitempty"`
	ShortcutCommand    *ShortcutCommand  `json:"shortcut_command,omitempty"`
}

type EnterMessage struct {
	Role        string            `json:"role"`
	Type        string            `json:"type,omitempty"`
	Content     string            `json:"content,omitempty"`
	ContentType string            `json:"content_type,omitempty"`
	MetaData    map[string]string `json:"meta_data,omitempty"`
}

type ShortcutCommand struct {
	// TODO: support for adding this on demand
}

type ObjectString struct {
	Type    string `json:"type"`
	Text    string `json:"text,omitempty"`
	FileID  string `json:"file_id,omitempty"`
	FileURL string `json:"file_url,omitempty"`
}

type ChatResponse struct {
	Data struct {
		ID             string            `json:"id"`
		ConversationID string            `json:"conversation_id"`
		BotID          string            `json:"bot_id"`
		CreatedAt      int64             `json:"created_at"`
		CompletedAt    int64             `json:"completed_at"`
		LastError      interface{}       `json:"last_error"`
		MetaData       map[string]string `json:"meta_data"`
		Status         string            `json:"status"`
		Usage          *Usage            `json:"usage"`
	} `json:"data"`
	Code int    `json:"code"`
	Msg  string `json:"msg"`
}

type Usage struct {
	TokenCount   int `json:"token_count"`
	OutputTokens int `json:"output_tokens"`
	InputTokens  int `json:"input_tokens"`
}

type ChatStreamResponse struct {
	Event string `json:"event"`
	Data  string `json:"data"`
}

type ChatStreamData struct {
	ID          string `json:"id,omitempty"`
	Role        string `json:"role,omitempty"`
	Type        string `json:"type,omitempty"`
	Content     string `json:"content,omitempty"`
	ContentType string `json:"content_type,omitempty"`

	ChatID         string `json:"chat_id,omitempty"`
	ConversationID string `json:"conversation_id,omitempty"`
	BotID          string `json:"bot_id,omitempty"`
	SectionID      string `json:"section_id,omitempty"`

	CreatedAt   int64 `json:"created_at,omitempty"`
	CompletedAt int64 `json:"completed_at,omitempty"`
	UpdatedAt   int64 `json:"updated_at,omitempty"`

	Status    string `json:"status,omitempty"`
	LastError struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
	} `json:"last_error,omitempty"`
	Code int    `json:"code"`
	Msg  string `json:"msg"`

	Usage *Usage `json:"usage,omitempty"`

	MetaData   map[string]string `json:"meta_data,omitempty"`
	FromModule interface{}       `json:"from_module,omitempty"`
	FromUnit   interface{}       `json:"from_unit,omitempty"`
}

type ChatStreamErrorResponse struct {
	Event string `json:"event"`
	Data  struct {
		Code int    `json:"code"`
		Msg  string `json:"msg"`
	} `json:"data"`
}
