package manager

import (
	"chat/adapter"
	adaptercommon "chat/adapter/common"
	"chat/addition/web"
	"chat/auth"
	"chat/channel"
	"chat/globals"
	"chat/manager/conversation"
	"chat/utils"
	"database/sql"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// PersistentChatRequest 持久化聊天请求
type PersistentChatRequest struct {
	ConversationID int64             `json:"conversation_id"`
	UserID         int64             `json:"user_id"`
	Model          string            `json:"model"`
	Messages       []globals.Message `json:"messages"`
	Think          *bool             `json:"think,omitempty"`
	WebEnabled     bool              `json:"web_enabled"`
	Restart        bool              `json:"restart"`

	// AI 参数
	MaxTokens         *int     `json:"max_tokens,omitempty"`
	Temperature       *float32 `json:"temperature,omitempty"`
	TopP              *float32 `json:"top_p,omitempty"`
	TopK              *int     `json:"top_k,omitempty"`
	PresencePenalty   *float32 `json:"presence_penalty,omitempty"`
	FrequencyPenalty  *float32 `json:"frequency_penalty,omitempty"`
	RepetitionPenalty *float32 `json:"repetition_penalty,omitempty"`
}

// StartPersistentChat 启动持久化聊天会话
func StartPersistentChat(db *sql.DB, cache *redis.Client, user *auth.User, req *PersistentChatRequest) (*ChatSession, error) {
	sm := GetSessionManager(db, cache)

	// 检查用户是否已有活跃会话
	if existingSession, exists := sm.GetConversationSession(req.UserID, req.ConversationID); exists {
		return existingSession, fmt.Errorf("conversation already has an active session: %s", existingSession.ID)
	}

	// 创建会话
	session, err := sm.CreateSession(req.UserID, req.ConversationID, req.Model, req.Messages)
	if err != nil {
		return nil, fmt.Errorf("failed to create session: %v", err)
	}

	// 异步启动AI请求处理
	go func() {
		defer func() {
			if r := recover(); r != nil {
				globals.Warn(fmt.Sprintf("Panic in persistent chat handler: %v", r))
				sm.FailSession(session.ID, fmt.Sprintf("Internal error: %v", r))
			}
		}()

		if err := processPersistentChatSession(db, cache, user, session, req); err != nil {
			sm.FailSession(session.ID, err.Error())
		}
	}()

	return session, nil
}

// processPersistentChatSession 处理持久化聊天会话
func processPersistentChatSession(db *sql.DB, cache *redis.Client, user *auth.User, session *ChatSession, req *PersistentChatRequest) error {
	sm := GetSessionManager(db, cache)

	// 标记会话为处理中
	session.Status = SessionProcessing
	sm.UpdateSessionProgress(session.ID, "正在初始化AI请求...")

	// 权限和订阅检查
	segment := adapter.ClearMessages(req.Model, req.Messages)
	check, plan, usageDetail := auth.CanEnableModelWithSubscription(db, cache, user, req.Model, segment)
	if check != nil {
		return fmt.Errorf("permission denied: %v", check)
	}

	sm.UpdateSessionProgress(session.ID, "正在连接AI服务...")

	// 创建缓冲区
	buffer := utils.NewBuffer(req.Model, segment, channel.ChargeInstance.GetCharge(req.Model))

	// 创建AI请求上下文
	chatProps := &adaptercommon.ChatProps{
		Model:             req.Model,
		Message:           segment,
		MaxTokens:         req.MaxTokens,
		Temperature:       req.Temperature,
		TopP:              req.TopP,
		TopK:              req.TopK,
		PresencePenalty:   req.PresencePenalty,
		FrequencyPenalty:  req.FrequencyPenalty,
		RepetitionPenalty: req.RepetitionPenalty,
		Think:             req.Think,
	}

	sm.UpdateSessionProgress(session.ID, "AI正在思考中...")

	// 执行AI请求
	_, err := channel.NewChatRequestWithCache(
		cache, buffer,
		auth.GetGroup(db, user),
		adaptercommon.CreateChatProps(chatProps, buffer),

		// 处理流式响应的回调
		func(data *globals.Chunk) error {
			// 检查会话是否被取消
			select {
			case <-session.Context.Done():
				return fmt.Errorf("session cancelled")
			default:
			}

			// 更新进度
			content := buffer.WriteChunk(data)
			if content != "" {
				sm.UpdateSessionProgress(session.ID, content)
			}

			// 发送到结果流
			select {
			case session.ResultStream <- data:
			default:
				// 如果通道满了，跳过
			}

			return nil
		},
	)

	// 处理请求结果
	if err != nil {
		if adapter.IsAvailableError(err) {
			// 可用性错误，回滚订阅使用量
			auth.RevertSubscriptionUsage(db, cache, user, req.Model)
			return fmt.Errorf("AI service error: %v", err)
		}
		return fmt.Errorf("request failed: %v", err)
	}

	// 缓存命中或订阅用量也记录消费，便于审计
	buffer.SetConversation(int(req.ConversationID))
	CollectQuotaWithDB(db, user, buffer, plan, usageDetail, nil)

	// 获取最终结果
	result := buffer.ReadWithDefault("AI响应为空")
	quota := buffer.GetQuota()

	// 将最终结果写入对话历史（用于刷新后仍能加载 assistant 消息）
	if session.UserID != -1 {
		if instance := conversation.LoadConversation(db, session.UserID, session.ConversationID); instance != nil {
			shouldSave := true
			messages := instance.GetMessage()
			if len(messages) > 0 {
				latest := messages[len(messages)-1]
				if latest.Role == globals.Assistant && latest.Content == result {
					shouldSave = false
				}
			}
			if shouldSave {
				instance.SaveResponse(db, result)
			}
		}
	}

	sm.UpdateSessionProgress(session.ID, "响应完成！")
	sm.CompleteSession(session.ID, result, quota)

	return nil
}

// GetSessionProgress 获取会话进度
func GetSessionProgress(sessionID string) (*ChatSession, error) {
	sm := GetSessionManager(nil, nil)
	session, exists := sm.GetSession(sessionID)
	if !exists {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}
	return session, nil
}

// CancelPersistentChat 取消持久化聊天
func CancelPersistentChat(sessionID string) error {
	sm := GetSessionManager(nil, nil)
	session, exists := sm.GetSession(sessionID)
	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	if session.Status != SessionPending && session.Status != SessionProcessing {
		return fmt.Errorf("session cannot be cancelled (status: %s)", session.Status)
	}

	sm.CancelSession(sessionID)
	return nil
}

// StreamSessionProgress 流式获取会话进度
type ProgressStreamHandler struct {
	SessionID string
	LastSent  int
	Session   *ChatSession
}

func NewProgressStreamHandler(sessionID string) (*ProgressStreamHandler, error) {
	sm := GetSessionManager(nil, nil)
	session, exists := sm.GetSession(sessionID)
	if !exists {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	return &ProgressStreamHandler{
		SessionID: sessionID,
		Session:   session,
		LastSent:  0,
	}, nil
}

// GetNewProgress 获取新的进度更新
func (psh *ProgressStreamHandler) GetNewProgress() string {
	if psh.Session == nil {
		return ""
	}

	totalProgress := psh.Session.TotalProgress
	if len(totalProgress) > psh.LastSent {
		newContent := totalProgress[psh.LastSent:]
		psh.LastSent = len(totalProgress)
		return newContent
	}

	return ""
}

// IsCompleted 检查会话是否完成
func (psh *ProgressStreamHandler) IsCompleted() bool {
	if psh.Session == nil {
		return true
	}

	return psh.Session.Status == SessionCompleted ||
		psh.Session.Status == SessionError ||
		psh.Session.Status == SessionCancelled
}

// GetSessionStatus 获取会话状态摘要
func (psh *ProgressStreamHandler) GetSessionStatus() map[string]interface{} {
	if psh.Session == nil {
		return map[string]interface{}{
			"status": "not_found",
		}
	}

	status := map[string]interface{}{
		"session_id":      psh.Session.ID,
		"conversation_id": psh.Session.ConversationID,
		"status":          psh.Session.Status,
		"model":           psh.Session.Model,
		"created_at":      psh.Session.CreatedAt,
		"last_activity":   psh.Session.LastActivity,
	}

	switch psh.Session.Status {
	case SessionCompleted:
		status["result"] = psh.Session.Result
		status["quota"] = psh.Session.Quota
		status["completed_at"] = psh.Session.CompletedAt
	case SessionError:
		status["error"] = psh.Session.Error
		status["completed_at"] = psh.Session.CompletedAt
	}

	return status
}

// ReconnectToSession 重新连接到现有会话
func ReconnectToSession(sessionID string) (*ProgressStreamHandler, error) {
	sm := GetSessionManager(nil, nil)

	// 尝试从内存获取
	if session, exists := sm.GetSession(sessionID); exists {
		return &ProgressStreamHandler{
			SessionID: sessionID,
			Session:   session,
			LastSent:  0, // 重连时从头开始发送
		}, nil
	}

	// 尝试从Redis恢复
	if session, err := sm.loadSessionFromCache(sessionID); err == nil {
		// 将恢复的会话加入内存管理
		sm.mutex.Lock()
		sm.sessions[sessionID] = session
		sm.mutex.Unlock()

		return &ProgressStreamHandler{
			SessionID: sessionID,
			Session:   session,
			LastSent:  0,
		}, nil
	}

	return nil, fmt.Errorf("session not found or expired: %s", sessionID)
}

// PersistentChatHandler 封装了持久化聊天的处理逻辑
type persistentChatHandler struct {
	session *ChatSession
}

// PersistentChatHandler 创建持久化会话的WebSocket处理器版本
func PersistentChatHandler(c *gin.Context, conn *Connection, user *auth.User, instance *conversation.Conversation, restart bool) (string, error) {
	db := utils.GetDBFromContext(c)
	cache := utils.GetCacheFromContext(c)

	// 检查是否已有活跃会话
	sessionManager := GetSessionManager(db, cache)
	userID := auth.GetId(db, user)

	if existingSession, exists := sessionManager.GetConversationSession(userID, instance.GetId()); exists {
		switch existingSession.Status {
		case SessionPending:
			// ...
		case SessionProcessing:
			// ...
		}
		if restart {
			CancelPersistentChat(existingSession.ID)
		} else {
			// 返回现有会话ID
			return existingSession.ID, nil
		}
	}

	// 准备聊天数据
	model := instance.GetModel()
	segment := adapter.ClearMessages(model, web.ToChatSearched(db, cache, user, instance, restart))
	segment = utils.ApplyThinkingDirective(segment, instance.GetThink())

	// 构建持久化聊天请求
	req := &PersistentChatRequest{
		ConversationID:    instance.GetId(),
		UserID:            userID,
		Model:             model,
		Messages:          segment,
		Think:             instance.GetThink(),
		WebEnabled:        instance.IsEnableWeb(),
		Restart:           restart,
		MaxTokens:         instance.GetMaxTokens(),
		Temperature:       instance.GetTemperature(),
		TopP:              instance.GetTopP(),
		TopK:              instance.GetTopK(),
		PresencePenalty:   instance.GetPresencePenalty(),
		FrequencyPenalty:  instance.GetFrequencyPenalty(),
		RepetitionPenalty: instance.GetRepetitionPenalty(),
	}

	// 启动持久化会话
	session, err := StartPersistentChat(db, cache, user, req)
	if err != nil {
		return "", fmt.Errorf("failed to start persistent chat: %w", err)
	}

	return session.ID, nil
}
