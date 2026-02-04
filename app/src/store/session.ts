import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./index.ts";
import { useDispatch, useSelector } from "react-redux";
import {
  SessionStatus,
  SessionProgressStream,
  reconnectToSession,
  cancelSession,
  getConversationSession,
} from "@/api/session.ts";
import {
  setMemory,
  getMemory,
  forgetMemory,
  setNumberMemory,
  getNumberMemory,
} from "@/utils/memory.ts";
import { updateMessage } from "./chat.ts";
import i18n from "@/i18n.ts";

type ProgressStage =
  | "searching"
  | "processing"
  | "initializing"
  | "connecting"
  | "thinking";

function createProgressProcessor(initialStage?: ProgressStage) {
  let outputStarted = false;
  let currentStage: ProgressStage | null = initialStage ?? null;

  const stagePatterns: Array<{ stage: ProgressStage; re: RegExp }> = [
    { stage: "searching", re: /正在(联网)?(搜索|检索)(中)?(?:\.{3}|…{1,3})?/g },
    { stage: "processing", re: /正在处理您的请求(?:\.{3}|…{1,3})?/g },
    { stage: "initializing", re: /正在初始化AI请求(?:\.{3}|…{1,3})?/g },
    { stage: "connecting", re: /正在连接AI服务(?:\.{3}|…{1,3})?/g },
    { stage: "thinking", re: /AI正在思考中(?:\.{3}|…{1,3})?/g },
  ];

  const completionPattern = /响应完成！/g;

  const getLastStageInText = (text: string): ProgressStage | null => {
    let lastStage: ProgressStage | null = null;
    let lastIndex = -1;
    for (const { stage, re } of stagePatterns) {
      for (const match of text.matchAll(re)) {
        const idx = match.index ?? -1;
        if (idx >= lastIndex) {
          lastIndex = idx;
          lastStage = stage;
        }
      }
    }
    return lastStage;
  };

  const stripMeta = (text: string) => {
    let result = text ?? "";
    for (const { re } of stagePatterns) {
      result = result.replace(re, "");
    }
    result = result.replace(completionPattern, "");
    return result;
  };

  const normalizeEscapedNewlines = (text: string) => {
    // only convert when there is no real newline, to avoid breaking literals like "\\n" or paths like "C:\\new"
    if (text.includes("\n")) return text;
    if (!text.includes("\\n") && !text.includes("\\r\\n")) return text;
    return text.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n");
  };

  return (progress: string) => {
    const raw = progress ?? "";

    if (!outputStarted) {
      const stage = getLastStageInText(raw) || currentStage;
      if (stage) currentStage = stage;

      const cleaned = stripMeta(raw);
      const hasRealOutput = cleaned.trim().length > 0;

      if (hasRealOutput) {
        outputStarted = true;
        return {
          kind: "output" as const,
          text: normalizeEscapedNewlines(cleaned),
          clear: true,
        };
      }

      if (stage) {
        return {
          kind: "status" as const,
          text: i18n.t(`progress.${stage}`),
        };
      }

      return { kind: "ignore" as const };
    }

    // output started: ignore meta only
    const cleaned = normalizeEscapedNewlines(stripMeta(raw));
    if (cleaned.trim().length === 0) {
      return { kind: "ignore" as const };
    }
    return {
      kind: "output" as const,
      text: cleaned,
      clear: false,
    };
  };
}

export const startSession = (
  sessionId: string,
  conversationId: number,
  model: string,
) => {
  return (dispatch: any, getState: () => RootState) => {
    const state = getState();
    if (state.session.progressStreams[sessionId]) {
      return;
    }

    const session: SessionStatus = {
      session_id: sessionId,
      conversation_id: conversationId,
      status: "pending",
      model,
      progress: "",
      total_progress: "",
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      quota: 0,
    };

    dispatch(addSession(session));
    dispatch(setCurrentSession(sessionId));

    const isWebEnabled = state.chat.web;
    const initialStage: ProgressStage | undefined = isWebEnabled
      ? "searching"
      : "processing";
    const processProgress = createProgressProcessor(initialStage);

    // 立即显示初始状态
    dispatch(
      updateMessage({
        id: conversationId,
        message: {
          message: i18n.t(`progress.${initialStage}`),
          end: false,
          replace: true,
        },
      }),
    );

    const progressStream = new SessionProgressStream(sessionId, {
      onProgress: (progress: string) => {
        const res = processProgress(progress);
        if (res.kind === "status") {
          dispatch(
            updateMessage({
              id: conversationId,
              message: {
                message: res.text,
                end: false,
                replace: true,
              },
            }),
          );
          return;
        }

        if (res.kind === "output") {
          if (res.clear) {
            dispatch(
              updateMessage({
                id: conversationId,
                message: {
                  message: "",
                  end: false,
                  replace: true,
                },
              }),
            );
          }

          if (res.text.trim().length === 0) return;
          dispatch(
            updateMessage({
              id: conversationId,
              message: {
                message: res.text,
                end: false,
              },
            }),
          );
        }
      },

      onStatusUpdate: (status: SessionStatus) => {
        dispatch(updateSession(status));
      },

      onCompleted: (status: SessionStatus, finalProgress: string) => {
        dispatch(
          updateSession({
            ...status,
            total_progress: finalProgress,
            status: "completed",
          }),
        );

        dispatch(
          updateMessage({
            id: conversationId,
            message: {
              message: "",
              end: true,
            },
          }),
        );

        dispatch(removeProgressStream(sessionId));
        dispatch(removeSession(sessionId));
      },

      onError: (error: string) => {
        const latest = getState().session.activeSessions[sessionId];
        dispatch(
          updateSession({
            ...(latest ?? session),
            status: "error",
            error,
          }),
        );
      },
    });

    dispatch(addProgressStream({ sessionId, stream: progressStream }));
    progressStream.connect();
  };
};

interface SessionState {
  activeSessions: Record<string, SessionStatus>;
  conversationSessions: Record<number, string>; // conversation_id -> session_id
  progressStreams: Record<string, SessionProgressStream>;
  reconnecting: boolean;
  currentSessionId?: string;
}

const initialState: SessionState = {
  activeSessions: {},
  conversationSessions: {},
  progressStreams: {},
  reconnecting: false,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    addSession: (state, action: PayloadAction<SessionStatus>) => {
      const session = action.payload;
      state.activeSessions[session.session_id] = session;
      state.conversationSessions[session.conversation_id] = session.session_id;

      // 保存到localStorage
      setMemory(`session_${session.session_id}`, JSON.stringify(session));
      setNumberMemory("current_session_conversation", session.conversation_id);
    },

    updateSession: (state, action: PayloadAction<SessionStatus>) => {
      const session = action.payload;
      state.activeSessions[session.session_id] = session;

      // 更新localStorage
      setMemory(`session_${session.session_id}`, JSON.stringify(session));
    },

    removeSession: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      const session = state.activeSessions[sessionId];

      if (session) {
        delete state.conversationSessions[session.conversation_id];
        forgetMemory(`session_${sessionId}`);
      }

      delete state.activeSessions[sessionId];

      // 清理进度流
      if (state.progressStreams[sessionId]) {
        state.progressStreams[sessionId].close();
        delete state.progressStreams[sessionId];
      }
    },

    setCurrentSession: (state, action: PayloadAction<string | undefined>) => {
      state.currentSessionId = action.payload;
      if (action.payload) {
        setMemory("current_session_id", action.payload);
      } else {
        forgetMemory("current_session_id");
      }
    },

    setReconnecting: (state, action: PayloadAction<boolean>) => {
      state.reconnecting = action.payload;
    },

    addProgressStream: (
      state,
      action: PayloadAction<{
        sessionId: string;
        stream: SessionProgressStream;
      }>,
    ) => {
      const { sessionId, stream } = action.payload;
      // 先关闭已存在的流
      if (state.progressStreams[sessionId]) {
        state.progressStreams[sessionId].close();
      }
      state.progressStreams[sessionId] = stream;
    },

    removeProgressStream: (state, action: PayloadAction<string>) => {
      const sessionId = action.payload;
      if (state.progressStreams[sessionId]) {
        state.progressStreams[sessionId].close();
        delete state.progressStreams[sessionId];
      }
    },

    clearAllSessions: (state) => {
      // 清理所有进度流
      Object.values(state.progressStreams).forEach((stream) => stream.close());

      // 清理localStorage中的会话数据
      Object.keys(state.activeSessions).forEach((sessionId) => {
        forgetMemory(`session_${sessionId}`);
      });

      forgetMemory("current_session_id");
      forgetMemory("current_session_conversation");

      return initialState;
    },
  },
});

export const {
  addSession,
  updateSession,
  removeSession,
  setCurrentSession,
  setReconnecting,
  addProgressStream,
  removeProgressStream,
  clearAllSessions,
} = sessionSlice.actions;

// Selectors
export const selectActiveSessions = (state: RootState) =>
  state.session.activeSessions;
export const selectConversationSessions = (state: RootState) =>
  state.session.conversationSessions;
export const selectCurrentSessionId = (state: RootState) =>
  state.session.currentSessionId;
export const selectReconnecting = (state: RootState) =>
  state.session.reconnecting;
export const selectProgressStreams = (state: RootState) =>
  state.session.progressStreams;

// 根据对话ID获取会话
export const selectSessionByConversation = (
  state: RootState,
  conversationId: number,
) => {
  const sessionId = state.session.conversationSessions[conversationId];
  return sessionId ? state.session.activeSessions[sessionId] : undefined;
};

// Custom hooks and actions
export function useSessionActions() {
  const dispatch = useDispatch();
  const activeSessions = useSelector(selectActiveSessions);

  return {
    // 创建新会话（当WebSocket接收到会话ID时调用）
    createSession: (
      sessionId: string,
      conversationId: number,
      model: string,
    ) => {
      const state = (dispatch as any)((_: any, getState: any) => getState());
      const session: SessionStatus = {
        session_id: sessionId,
        conversation_id: conversationId,
        status: "pending",
        model,
        progress: "",
        total_progress: "",
        created_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        quota: 0,
      };

      dispatch(addSession(session));
      dispatch(setCurrentSession(sessionId));

      const isWebEnabled = (state as any).chat.web;
      const initialStage: ProgressStage | undefined = isWebEnabled
        ? "searching"
        : "processing";
      const processProgress = createProgressProcessor(initialStage);

      // 立即显示初始状态
      dispatch(
        updateMessage({
          id: conversationId,
          message: {
            message: i18n.t(`progress.${initialStage}`),
            end: false,
            replace: true,
          },
        }),
      );

      // 立即开始监听进度流
      const progressStream = new SessionProgressStream(sessionId, {
        onProgress: (progress: string) => {
          const res = processProgress(progress);
          if (res.kind === "status") {
            dispatch(
              updateMessage({
                id: conversationId,
                message: {
                  message: res.text,
                  end: false,
                  replace: true,
                },
              }),
            );
            return;
          }

          if (res.kind === "output") {
            if (res.clear) {
              dispatch(
                updateMessage({
                  id: conversationId,
                  message: {
                    message: "",
                    end: false,
                    replace: true,
                  },
                }),
              );
            }

            if (res.text.trim().length === 0) return;
            dispatch(
              updateMessage({
                id: conversationId,
                message: {
                  message: res.text,
                  end: false,
                },
              }),
            );
          }
        },

        onStatusUpdate: (status: SessionStatus) => {
          dispatch(updateSession(status));
        },

        onCompleted: (status: SessionStatus, finalProgress: string) => {
          dispatch(
            updateSession({
              ...status,
              total_progress: finalProgress,
              status: "completed",
            }),
          );

          // 发送完成消息
          dispatch(
            updateMessage({
              id: conversationId,
              message: {
                message: "",
                end: true,
              },
            }),
          );

          dispatch(removeProgressStream(sessionId));
          dispatch(removeSession(sessionId));
        },

        onError: (error: string) => {
          console.error("Session progress error:", error);
          dispatch(
            updateSession({
              ...activeSessions[sessionId],
              status: "error",
              error,
            }),
          );
        },
      });

      dispatch(addProgressStream({ sessionId, stream: progressStream }));
      progressStream.connect();
    },

    // 重连到现有会话
    reconnectToExistingSession: async (sessionId: string) => {
      dispatch(setReconnecting(true));

      try {
        const response = await reconnectToSession(sessionId);

        if (response.status && response.data) {
          const sessionData = response.data;
          dispatch(updateSession(sessionData));
          dispatch(setCurrentSession(sessionId));

          // 如果会话还在进行中，重新连接进度流
          if (
            sessionData.status === "pending" ||
            sessionData.status === "processing"
          ) {
            const processProgress = createProgressProcessor();
            const progressStream = new SessionProgressStream(sessionId, {
              onProgress: (progress: string) => {
                const res = processProgress(progress);
                if (res.kind === "status") {
                  dispatch(
                    updateMessage({
                      id: sessionData.conversation_id,
                      message: {
                        message: res.text,
                        end: false,
                        replace: true,
                      },
                    }),
                  );
                  return;
                }

                if (res.kind === "output") {
                  if (res.clear) {
                    dispatch(
                      updateMessage({
                        id: sessionData.conversation_id,
                        message: {
                          message: "",
                          end: false,
                          replace: true,
                        },
                      }),
                    );
                  }
                  if (res.text.trim().length === 0) return;
                  dispatch(
                    updateMessage({
                      id: sessionData.conversation_id,
                      message: {
                        message: res.text,
                        end: false,
                      },
                    }),
                  );
                }
              },

              onStatusUpdate: (status: SessionStatus) => {
                dispatch(updateSession(status));
              },

              onCompleted: (status: SessionStatus, finalProgress: string) => {
                dispatch(
                  updateSession({
                    ...status,
                    total_progress: finalProgress,
                    status: "completed",
                  }),
                );

                dispatch(
                  updateMessage({
                    id: sessionData.conversation_id,
                    message: {
                      message: "",
                      end: true,
                    },
                  }),
                );

                dispatch(removeProgressStream(sessionId));
                dispatch(removeSession(sessionId));
              },

              onError: (error: string) => {
                console.error("Session reconnection progress error:", error);
              },
            });

            dispatch(addProgressStream({ sessionId, stream: progressStream }));
            progressStream.connect();
          } else {
            // 会话已完成，显示最终结果
            if (sessionData.result) {
              dispatch(
                updateMessage({
                  id: sessionData.conversation_id,
                  message: {
                    message: sessionData.result,
                    end: true,
                  },
                }),
              );
            }
          }

          return true;
        } else {
          console.error("Failed to reconnect:", response.message);
          return false;
        }
      } catch (error) {
        console.error("Error reconnecting to session:", error);
        return false;
      } finally {
        dispatch(setReconnecting(false));
      }
    },

    // 取消会话
    cancelCurrentSession: async () => {
      const sessionId = getMemory("current_session_id");
      if (!sessionId) return false;

      try {
        const response = await cancelSession(sessionId);
        if (response.status) {
          dispatch(removeSession(sessionId));
          dispatch(setCurrentSession(undefined));
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error cancelling session:", error);
        return false;
      }
    },

    // 检查对话是否有活跃会话
    checkConversationSession: async (conversationId: number) => {
      try {
        const response = await getConversationSession(conversationId);

        if (response.status && response.data) {
          const sessionData = response.data;
          dispatch(addSession(sessionData));
          return sessionData.session_id;
        }

        return null;
      } catch (error) {
        console.error("Error checking conversation session:", error);
        return null;
      }
    },

    // 从localStorage恢复会话状态
    restoreSessionsFromStorage: () => {
      const currentSessionId = getMemory("current_session_id");
      const currentConversationId = getNumberMemory(
        "current_session_conversation",
        -1,
      );

      if (currentSessionId) {
        const sessionData = getMemory(`session_${currentSessionId}`);
        if (sessionData) {
          try {
            const session: SessionStatus = JSON.parse(sessionData);
            dispatch(addSession(session));
            dispatch(setCurrentSession(currentSessionId));

            // 如果会话未完成且匹配当前对话，尝试重连
            if (
              (session.status === "pending" ||
                session.status === "processing") &&
              session.conversation_id === currentConversationId
            ) {
              // 延迟重连，等待组件加载完成
              setTimeout(() => {
                dispatch({
                  type: "session/reconnectToExistingSession",
                  payload: currentSessionId,
                });
              }, 1000);
            }
          } catch (error) {
            console.error("Error parsing stored session:", error);
            forgetMemory(`session_${currentSessionId}`);
          }
        }
      }
    },

    // 清理所有会话
    clearAll: () => {
      dispatch(clearAllSessions());
    },
  };
}

// 页面加载时自动恢复会话的中间件
export const autoRestoreSessionMiddleware =
  () => (next: any) => (action: any) => {
    const result = next(action);

    // 当Redux store初始化完成后恢复会话
    if (action.type === "@@INIT" || action.type === "persist/REHYDRATE") {
      // 延迟执行，确保组件已加载
      setTimeout(() => {
        const actions = useSessionActions();
        actions.restoreSessionsFromStorage();
      }, 1000);
    }

    return result;
  };

export default sessionSlice.reducer;
