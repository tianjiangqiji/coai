import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSessionActions, selectReconnecting } from "@/store/session.ts";
import {
  createMessage,
  selectConversations,
  selectCurrent,
  useConversationActions,
} from "@/store/chat.ts";
import { AssistantRole } from "@/api/types.tsx";
import { getMemory, getNumberMemory } from "@/utils/memory.ts";
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";

interface SessionRecoveryProps {
  onRecoveryComplete?: () => void;
  onRecoveryFailed?: (error: string) => void;
}

const SessionRecovery: React.FC<SessionRecoveryProps> = ({
  onRecoveryComplete,
  onRecoveryFailed,
}) => {
  const [recoveryStatus, setRecoveryStatus] = useState<
    "checking" | "recovering" | "success" | "failed" | "none"
  >("none");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showRecoveryUI, setShowRecoveryUI] = useState(false);

  const dispatch = useDispatch();
  const sessionActions = useSessionActions();
  const { toggle } = useConversationActions();
  const isReconnecting = useSelector(selectReconnecting);
  const currentConversationId = useSelector(selectCurrent);
  const conversations = useSelector(selectConversations);

  useEffect(() => {
    checkAndRecoverSession();
  }, []);

  const checkAndRecoverSession = async () => {
    setRecoveryStatus("checking");
    setShowRecoveryUI(true);

    try {
      // 检查localStorage中是否有未完成的会话
      const storedSessionId = getMemory("current_session_id");
      const storedConversationId = getNumberMemory(
        "current_session_conversation",
        -1,
      );

      if (!storedSessionId) {
        setRecoveryStatus("none");
        setShowRecoveryUI(false);
        onRecoveryComplete?.();
        return;
      }

      // 检查存储的会话是否与当前对话匹配
      if (
        storedConversationId !== currentConversationId &&
        currentConversationId !== -1
      ) {
        console.log(
          "Stored session does not match current conversation, skipping recovery",
        );
        sessionActions.clearAll();
        setRecoveryStatus("none");
        setShowRecoveryUI(false);
        onRecoveryComplete?.();
        return;
      }

      // 如果当前还没选中对话（刷新初期经常是 -1），先自动打开正在会话中的对话
      if (currentConversationId === -1 && storedConversationId !== -1) {
        try {
          await toggle(storedConversationId);
        } catch {
          // ignore
        }

        // 确保有一个 assistant 占位消息承接流式输出
        const conv = conversations[storedConversationId];
        const last = conv?.messages?.[conv.messages.length - 1];
        const needPlaceholder =
          !last || last.role !== AssistantRole || last.end === true;
        if (needPlaceholder) {
          dispatch(
            createMessage({
              id: storedConversationId,
              role: AssistantRole,
              content: "",
            }),
          );
        }
      }

      // 如果当前对话有活跃会话，检查是否需要恢复
      if (currentConversationId !== -1) {
        const activeSessionId = await sessionActions.checkConversationSession(
          currentConversationId,
        );

        if (activeSessionId && activeSessionId !== storedSessionId) {
          // 发现不同的活跃会话，使用服务器上的会话
          console.log(
            "Found different active session on server, recovering from server",
          );
          setRecoveryStatus("recovering");

          const success =
            await sessionActions.reconnectToExistingSession(activeSessionId);
          if (success) {
            setRecoveryStatus("success");
            setTimeout(() => {
              setShowRecoveryUI(false);
              onRecoveryComplete?.();
            }, 2000);
          } else {
            throw new Error("无法重连到服务器会话");
          }
          return;
        }
      }

      // 尝试恢复存储的会话
      setRecoveryStatus("recovering");
      const success =
        await sessionActions.reconnectToExistingSession(storedSessionId);

      if (success) {
        setRecoveryStatus("success");
        setTimeout(() => {
          setShowRecoveryUI(false);
          onRecoveryComplete?.();
        }, 2000);
      } else {
        throw new Error("无法恢复会话，可能会话已过期或服务器重启");
      }
    } catch (error) {
      console.error("Session recovery failed:", error);
      const errorMsg = error instanceof Error ? error.message : "未知错误";
      setErrorMessage(errorMsg);
      setRecoveryStatus("failed");
      onRecoveryFailed?.(errorMsg);

      // 清理无效的会话数据
      sessionActions.clearAll();

      setTimeout(() => {
        setShowRecoveryUI(false);
      }, 5000);
    }
  };

  const retryRecovery = () => {
    checkAndRecoverSession();
  };

  const skipRecovery = () => {
    sessionActions.clearAll();
    setShowRecoveryUI(false);
    onRecoveryComplete?.();
  };

  if (!showRecoveryUI) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex flex-col items-center text-center">
          {recoveryStatus === "checking" && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">检查会话状态</h3>
              <p className="text-gray-600 dark:text-gray-300">
                正在检查是否有需要恢复的会话...
              </p>
            </>
          )}

          {recoveryStatus === "recovering" && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">恢复会话中</h3>
              <p className="text-gray-600 dark:text-gray-300">
                正在重新连接到您的AI对话会话...
              </p>
              {isReconnecting && (
                <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                  重新建立连接...
                </div>
              )}
            </>
          )}

          {recoveryStatus === "success" && (
            <>
              <CheckCircle className="w-8 h-8 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-green-700 dark:text-green-400">
                会话恢复成功
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                您的AI对话已成功恢复，可以继续之前的对话了。
              </p>
            </>
          )}

          {recoveryStatus === "failed" && (
            <>
              <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">
                会话恢复失败
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {errorMessage || "无法恢复之前的对话会话"}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={retryRecovery}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  重试
                </button>
                <button
                  onClick={skipRecovery}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  跳过
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionRecovery;
