import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/components/ui/lib/utils.ts";
import DrawingSidebar, {
  DrawingSubmitPayload,
} from "@/components/drawing/DrawingSidebar.tsx";
import DrawingMain, {
  DrawingMainState,
} from "@/components/drawing/DrawingMain.tsx";
import { apiEndpoint, tokenField } from "@/conf/bootstrap.ts";
import { getMemory } from "@/utils/memory.ts";
import { toast } from "sonner";
import { getErrorMessage } from "@/utils/base.ts";
import type { Model } from "@/api/types.tsx";

import { DrawingHistoryItem, drawingDB } from "@/utils/drawing-db.ts";

const initialState: DrawingMainState = {
  status: "idle",
  images: [],
  message: "",
  modelName: undefined,
};

const DRAWING_CACHE_KEY = "drawing_results";
const DRAWING_HISTORY_KEY = "drawing_history_v2";
const DRAWING_POLLING_KEY = "drawing_polling_active";

function Drawing() {
  const { t } = useTranslation();
  const [mainState, setMainState] = useState<DrawingMainState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(() => {
    return localStorage.getItem(DRAWING_POLLING_KEY) === "true";
  });
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [history, setHistory] = useState<DrawingHistoryItem[]>([]);
  const isLoadedRef = useRef(false);
  const [mobileTab, setMobileTab] = useState<"prepare" | "generate">("prepare");
  const abortRef = useRef<AbortController | null>(null);

  const isMobile = useMemo(() => window.innerWidth <= 768, []);

  // 保存历史记录到 IndexedDB
  useEffect(() => {
    if (!isLoadedRef.current) return; // 初始加载完成前不保存，防止空状态覆盖数据库

    const saveToDB = async () => {
      try {
        await drawingDB.saveAll(history, 100);
      } catch (e) {
        console.error("[drawing] failed to save history to IndexedDB", e);
      }
    };
    saveToDB();
  }, [history]);

  // 加载 IndexedDB 的最新结果和历史记录
  useEffect(() => {
    const initData = async () => {
      let finalHistory: DrawingHistoryItem[] = [];
      try {
        // 1. 从 IndexedDB 读取
        finalHistory = await drawingDB.getAll();

        // 2. 尝试从 LocalStorage 迁移旧数据
        const cachedHistory = localStorage.getItem(DRAWING_HISTORY_KEY);
        if (cachedHistory) {
          try {
            const parsedHistory = JSON.parse(cachedHistory);
            if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
              parsedHistory.forEach((item: any) => {
                if (!finalHistory.some((i) => i.id === item.id)) {
                  finalHistory.push(item);
                }
              });
              finalHistory.sort((a, b) => b.time - a.time);
            }
            localStorage.removeItem(DRAWING_HISTORY_KEY);
          } catch (e) {
            console.warn("[drawing] failed to migrate legacy history", e);
          }
        }

        // 3. 检查当前缓存的图片是否需要补全
        const cachedResult = localStorage.getItem(DRAWING_CACHE_KEY);
        if (cachedResult) {
          try {
            const parsed = JSON.parse(cachedResult);
            setMainState((prev) => ({ ...prev, ...parsed, status: "success" }));

            const exists = finalHistory.some(
              (item) =>
                JSON.stringify(item.images) === JSON.stringify(parsed.images) &&
                item.message === parsed.message,
            );

            if (!exists && parsed.images && parsed.images.length > 0) {
              finalHistory.unshift({
                id: `legacy-${Date.now()}`,
                time: Date.now(),
                status: "success",
                images: parsed.images,
                message: parsed.message || "",
                modelName: parsed.modelName,
                params: {
                  modelId: "unknown",
                  prompt: "已缓存的绘图结果",
                  n: parsed.images.length,
                  size: "1024x1024",
                },
              });
            }
          } catch (e) {
            console.warn("[drawing] failed to parse cache", e);
          }
        }

        setHistory(finalHistory);
        isLoadedRef.current = true; // 标记加载完成
      } catch (e) {
        console.error("[drawing] failed to initialize history", e);
        isLoadedRef.current = true;
      }
    };

    initData();
  }, []);

  useEffect(() => {
    if (polling) {
      localStorage.setItem(DRAWING_POLLING_KEY, "true");
    } else {
      localStorage.removeItem(DRAWING_POLLING_KEY);
    }
  }, [polling]);

  // 监听状态变化保存到最新缓存（带异常处理）
  useEffect(() => {
    if (
      mainState.status === "success" &&
      (mainState.images.length > 0 || mainState.message)
    ) {
      try {
        localStorage.setItem(
          DRAWING_CACHE_KEY,
          JSON.stringify({
            images: mainState.images,
            message: mainState.message,
            modelName: mainState.modelName,
          }),
        );
      } catch (e) {
        console.warn("[drawing] failed to save current result to cache", e);
      }
    }
  }, [mainState]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleModelChange = useCallback((_id: string, model: Model | null) => {
    setCurrentModel(model);
    setMainState((prev) => ({
      ...prev,
      modelName: model?.name,
    }));
  }, []);

  const fetchTaskResults = useCallback(async () => {
    const token = getMemory(tokenField);
    try {
      const response = await fetch(`${apiEndpoint}/v1/images/tasks`, {
        headers: {
          ...(token ? { Authorization: token } : {}),
        },
      });
      if (response.ok) {
        const res = await response.json();

        // 如果后端返回 status: false，说明此时 DB 中还没有该用户的任务
        // 这种情况在点击生成瞬间很常见，应该继续轮询，而不是释放按钮
        if (res.status === false) {
          // 如果任务还没创建，但已经在 submitting 中，保持现状
          return "no_task";
        }

        if (res?.state === "running") {
          return "running";
        }

        if (res?.state === "ready") {
          if (res.data) {
            const data = res.data;
            const finalImages = (data.data || [])
              .map((item: any) => item.url || item.b64_json)
              .filter(Boolean);

            if (finalImages.length > 0) {
              const nextState: DrawingMainState = {
                status: "success",
                images: finalImages,
                message: "",
                modelName: currentModel?.name,
              };
              setMainState(nextState);
              setSubmitting(false);
              setPolling(false);
              localStorage.removeItem(DRAWING_POLLING_KEY);
              if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
              }

              setHistory((prev) => {
                const exists = prev.some(
                  (item) =>
                    JSON.stringify(item.images) === JSON.stringify(finalImages),
                );
                if (exists) return prev;

                return [
                  {
                    id: Date.now().toString(),
                    time: Date.now(),
                    status: "success",
                    images: finalImages,
                    message: "",
                    modelName: currentModel?.name,
                    params: {
                      modelId: currentModel?.id || "unknown",
                      prompt: "绘图结果",
                      n: finalImages.length,
                      size: "1024x1024",
                    },
                  },
                  ...prev,
                ];
              });
              return "finished";
            }
          }

          setSubmitting(false);
          setPolling(false);
          localStorage.removeItem(DRAWING_POLLING_KEY);
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setMainState((prev) => ({
            ...prev,
            status: "error",
            error: res?.error || "生成失败，请重试",
          }));
          return "finished";
        }
      }
    } catch (e) {
      console.warn("[drawing] poll error", e);
      // 如果发生网络错误，返回 error，不自动释放按钮（交给 setInterval 重试）
      return "error";
    }
    return "no_task";
  }, [currentModel]);

  useEffect(() => {
    // 页面加载或切换回来时，尝试获取一次任务结果
    const checkTask = async () => {
      const result = await fetchTaskResults();
      if (result === "running") {
        setPolling(true);
        setSubmitting(true);
        setMainState((prev) => ({
          ...prev,
          status: "running",
        }));
      } else if (result === "finished") {
        // 只有明确完成（成功或失败）才释放
        setSubmitting(false);
        setPolling(false);
      } else if (result === "no_task") {
        // 如果后端明确返回 status: false，且当前不在提交/轮询中，说明确实没任务，释放按钮
        if (!submitting) {
          setSubmitting(false);
          setPolling(false);
          localStorage.removeItem(DRAWING_POLLING_KEY);
        }
      }
    };

    // 初始检查
    checkTask();

    // 如果正在提交中，开启轮询
    let timer: NodeJS.Timeout;
    if (submitting || polling) {
      // 这里的逻辑：只要是提交状态，就一直轮询，直到 fetchTaskResults 内部将状态设为 false
      timer = setTimeout(() => {
        // 立即执行一次
        fetchTaskResults();
        pollTimerRef.current = setInterval(async () => {
          await fetchTaskResults();
        }, 5000);
      }, 3000);

      return () => {
        clearTimeout(timer);
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      };
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [submitting, polling, fetchTaskResults]);

  const handleSubmit = useCallback(
    async (payload: DrawingSubmitPayload) => {
      setSubmitting(true);
      setPolling(true);

      const nextState: DrawingMainState = {
        status: "running",
        images: [],
        message: "",
        modelName: currentModel?.name,
      };
      setMainState(nextState);

      // 手机端在开始生成后跳转到生成页
      if (isMobile) {
        setMobileTab("generate");
      }

      const token = getMemory(tokenField);
      const endpoint = `${apiEndpoint}/v1/images/generations`;

      const requestBody = {
        model: payload.modelId,
        task: true,
        prompt: payload.prompt,
        image: payload.image,
        size: payload.size,
        n: payload.n,
      };

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: token } : {}),
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          if (response.status === 409) {
            const detail = await response.json().catch(() => null);
            throw new Error(
              detail?.message || "已有未完成的绘图任务，请先完成/领取结果",
            );
          }
          throw new Error(response.statusText || "Request failed");
        }

        // 后端现在改为立即返回任务已开始，这里只需等待轮询
        console.debug("[drawing] task started, waiting for poll...");
      } catch (error) {
        setSubmitting(false);
        setPolling(false);
        localStorage.removeItem(DRAWING_POLLING_KEY);
        const friendly = getErrorMessage(error);
        setMainState({
          status: "error",
          images: [],
          message: "",
          modelName: currentModel?.name,
          error: friendly,
        });
        toast.error(t("drawing.errorMessage"), {
          description: friendly,
        });
      }
    },
    [currentModel, t, isMobile],
  );

  const handleApplyHistory = useCallback(
    (item: DrawingHistoryItem) => {
      setMainState({
        status: "success",
        images: item.images,
        message: item.message,
        modelName: item.modelName,
      });
      if (isMobile) {
        setMobileTab("generate");
      }
    },
    [isMobile],
  );

  const handleDeleteHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClearHistory = useCallback(async () => {
    await drawingDB.clear();
    setHistory([]);
    toast.success(t("drawing.historyCleared") || "历史记录已清空");
  }, [t]);

  return (
    <div className="home-page flex flex-row flex-1 overflow-hidden relative">
      <DrawingSidebar
        onSubmit={handleSubmit}
        submitting={submitting}
        onModelChange={handleModelChange}
        history={history}
        onApplyHistory={handleApplyHistory}
        onDeleteHistory={handleDeleteHistory}
        onClearHistory={handleClearHistory}
        onMobileTabChange={setMobileTab}
        className={cn(
          "transition-all duration-300",
          isMobile && mobileTab !== "prepare" && "hidden",
        )}
      />
      <DrawingMain
        {...mainState}
        className={cn(
          "transition-all duration-300",
          isMobile && mobileTab !== "generate" && "hidden",
        )}
      />
    </div>
  );
}

export default Drawing;
