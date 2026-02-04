import { websocketEndpoint } from "@/conf/bootstrap.ts";
import { getMemory } from "@/utils/memory.ts";
import { tokenField } from "@/conf/bootstrap.ts";

export interface SessionStatus {
  session_id: string;
  conversation_id: number;
  status: "pending" | "processing" | "completed" | "error" | "cancelled";
  model: string;
  progress: string;
  total_progress: string;
  created_at: string;
  last_activity: string;
  completed_at?: string;
  result?: string;
  error?: string;
  quota: number;
}

export interface SessionResponse {
  status: boolean;
  data?: SessionStatus;
  message?: string;
}

export interface SessionListResponse {
  status: boolean;
  data?: SessionStatus[];
  message?: string;
}

// 获取会话状态
export async function getSessionStatus(
  sessionId: string,
): Promise<SessionResponse> {
  try {
    const token = getMemory(tokenField);
    const response = await fetch(
      `${websocketEndpoint}/session/status/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return await response.json();
  } catch (error) {
    console.error("Failed to get session status:", error);
    return {
      status: false,
      message: "Network error",
    };
  }
}

// 取消会话
export async function cancelSession(
  sessionId: string,
): Promise<SessionResponse> {
  try {
    const token = getMemory(tokenField);
    const response = await fetch(
      `${websocketEndpoint}/session/cancel/${sessionId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return await response.json();
  } catch (error) {
    console.error("Failed to cancel session:", error);
    return {
      status: false,
      message: "Network error",
    };
  }
}

// 重连到会话
export async function reconnectToSession(
  sessionId: string,
): Promise<SessionResponse> {
  try {
    const token = getMemory(tokenField);
    const response = await fetch(
      `${websocketEndpoint}/session/reconnect/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return await response.json();
  } catch (error) {
    console.error("Failed to reconnect to session:", error);
    return {
      status: false,
      message: "Network error",
    };
  }
}

// 获取用户所有会话
export async function getUserSessions(): Promise<SessionListResponse> {
  try {
    const token = getMemory(tokenField);
    const response = await fetch(`${websocketEndpoint}/session/list`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (error) {
    console.error("Failed to get user sessions:", error);
    return {
      status: false,
      message: "Network error",
    };
  }
}

// 获取对话的活跃会话
export async function getConversationSession(
  conversationId: number,
): Promise<SessionResponse> {
  try {
    const token = getMemory(tokenField);
    const response = await fetch(
      `${websocketEndpoint}/session/conversation/${conversationId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return await response.json();
  } catch (error) {
    console.error("Failed to get conversation session:", error);
    return {
      status: false,
      message: "Network error",
    };
  }
}

// 流式获取会话进度
export class SessionProgressStream {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private onProgress?: (progress: string) => void;
  private onStatusUpdate?: (status: SessionStatus) => void;
  private onCompleted?: (status: SessionStatus, finalProgress: string) => void;
  private onError?: (error: string) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private allowReconnect = true;
  private sentLength = 0;

  constructor(
    sessionId: string,
    callbacks: {
      onProgress?: (progress: string) => void;
      onStatusUpdate?: (status: SessionStatus) => void;
      onCompleted?: (status: SessionStatus, finalProgress: string) => void;
      onError?: (error: string) => void;
    },
  ) {
    this.sessionId = sessionId;
    this.onProgress = callbacks.onProgress;
    this.onStatusUpdate = callbacks.onStatusUpdate;
    this.onCompleted = callbacks.onCompleted;
    this.onError = callbacks.onError;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${websocketEndpoint.replace("http", "ws")}/session/stream/${this.sessionId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log(`Connected to session progress stream: ${this.sessionId}`);
      this.reconnectAttempts = 0;
      this.allowReconnect = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "status":
            this.onStatusUpdate?.(data.status);
            break;

          case "progress":
            if (typeof data.progress === "string" && data.progress.length > 0) {
              this.sentLength += data.progress.length;
              this.onProgress?.(data.progress);
            }
            break;

          case "completed":
            if (typeof data.progress === "string") {
              const remaining = data.progress.slice(this.sentLength);
              if (remaining.length > 0) {
                this.sentLength += remaining.length;
                this.onProgress?.(remaining);
              }
              this.onCompleted?.(data.status, data.progress);
            } else {
              this.onCompleted?.(data.status, "");
            }
            this.close(false);
            break;

          case "ping":
            // 心跳响应，无需处理
            break;

          default:
            console.warn("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log(`Session progress stream closed: ${this.sessionId}`);
      if (this.allowReconnect) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("Session progress stream error:", error);
      this.onError?.("连接错误，正在尝试重连...");
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onError?.("重连失败，请刷新页面或手动重新连接");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      10000,
    );

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  close(reconnect: boolean = false): void {
    this.allowReconnect = reconnect;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
