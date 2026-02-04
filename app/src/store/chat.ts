import { createSlice } from "@reduxjs/toolkit";
import {
  AssistantRole,
  ConversationInstance,
  Model,
  UserRole,
} from "@/api/types.tsx";
import { Message } from "@/api/types.tsx";
import { AppDispatch, RootState } from "./index.ts";
import {
  getArrayMemory,
  getBooleanMemory,
  getMemory,
  setArrayMemory,
  setMemory,
  setNumberMemory,
} from "@/utils/memory.ts";
import {
  getOfflineModels,
  loadPreferenceModels,
  setOfflineModels,
} from "@/conf/storage.ts";
import {
  deleteConversation as doDeleteConversation,
  deleteAllConversations as doDeleteAllConversations,
  renameConversation as doRenameConversation,
  loadConversation,
  getConversationList,
} from "@/api/history.ts";
import { getConversationSession } from "@/api/session.ts";
import { CustomMask, Mask } from "@/masks/types.ts";
import { listMasks } from "@/api/mask.ts";
import { useDispatch, useSelector } from "react-redux";
import { useMemo } from "react";
import { ChatProps, ConnectionStack, StreamMessage } from "@/api/connection.ts";
import { useTranslation } from "react-i18next";
import { startSession } from "@/store/session.ts";
import {
  contextSelector,
  frequencyPenaltySelector,
  historySelector,
  maxTokensSelector,
  presencePenaltySelector,
  repetitionPenaltySelector,
  temperatureSelector,
  topKSelector,
  topPSelector,
} from "@/store/settings.ts";

export type ConversationSerialized = {
  model?: string;
  messages: Message[];
};

export type ConnectionEvent = {
  id: number;
  event: string;
  index?: number;
  message?: string;
};

type initialStateType = {
  history: ConversationInstance[];
  conversations: Record<number, ConversationSerialized>;
  model: string;
  web: boolean;
  think: boolean;
  current: number;
  loading_conversation: number;
  model_list: string[];
  market: boolean;
  mask_item: Mask | null;
  custom_masks: CustomMask[];
  support_models: Model[];
};

const defaultConversation: ConversationSerialized = { messages: [] };

export function inModel(supportModels: Model[], model: string): boolean {
  return (
    model.length > 0 &&
    supportModels.filter((item: Model) => item.id === model).length > 0
  );
}

export function getModel(
  supportModels: Model[],
  model: string | undefined | null,
): string {
  if (supportModels.length === 0) return "";
  return model && inModel(supportModels, model) ? model : supportModels[0].id;
}

export function getModelList(
  supportModels: Model[],
  models: string[],
  select: string,
): string[] {
  const list = models.filter((item) => inModel(supportModels, item));
  const selection = getModel(supportModels, select);
  if (!list.includes(selection)) list.push(selection);
  return list;
}

export const stack = new ConnectionStack();
let toggleAbortController: AbortController | null = null;
const offline = loadPreferenceModels(getOfflineModels());
const chatSlice = createSlice({
  name: "chat",
  initialState: {
    history: [],
    messages: [],
    conversations: {
      [-1]: { ...defaultConversation },
    },
    web: getBooleanMemory("web", false),
    think: getBooleanMemory("think", true),
    current: -1,
    loading_conversation: -1,
    model: getModel(offline, getMemory("model")),
    model_list: getModelList(
      offline,
      getArrayMemory("model_mark_list"),
      getMemory("model"),
    ),
    market: false,
    mask_item: null,
    custom_masks: [],
    support_models: offline,
  } as initialStateType,
  reducers: {
    createMessage: (state, action) => {
      const { id, role, content } = action.payload as {
        id: number;
        role: string;
        content?: string;
      };

      const conversation = state.conversations[id];
      if (!conversation) return;

      conversation.messages.push({
        role: role ?? AssistantRole,
        content: content ?? "",
        end: role === AssistantRole ? false : undefined,
      });
    },
    fillMaskItem: (state) => {
      const conversation = state.conversations[-1];

      if (state.mask_item && conversation.messages.length === 0) {
        conversation.messages = [...state.mask_item.context];
        state.mask_item = null;
      }
    },
    updateMessage: (state, action) => {
      const { id, message } = action.payload as {
        id: number;
        message: StreamMessage;
      };
      const conversation = state.conversations[id];
      if (!conversation) return;

      if (conversation.messages.length === 0)
        conversation.messages.push({
          role: AssistantRole,
          content: message.message,
          keyword: message.keyword,
          quota: message.quota,
          end: message.end,
          plan: message.plan,
        });

      const instance = conversation.messages[conversation.messages.length - 1];
      if (message.replace) {
        instance.content = message.message;
      } else if (message.message.length > 0) {
        instance.content += message.message;
      }
      if (message.keyword) instance.keyword = message.keyword;
      if (message.quota) instance.quota = message.quota;
      if (message.end) instance.end = message.end;
      instance.plan = message.plan;
    },
    removeMessage: (state, action) => {
      const { id, idx } = action.payload as { id: number; idx: number };
      const conversation = state.conversations[id];
      if (!conversation) return;

      conversation.messages.splice(idx, 1);
    },
    restartMessage: (state, action) => {
      const id = action.payload as number;
      const conversation = state.conversations[id];
      if (!conversation || conversation.messages.length === 0) return;

      // 删除最后一条 assistant 消息（如果存在）
      const lastMessage =
        conversation.messages[conversation.messages.length - 1];
      if (lastMessage.role === AssistantRole) {
        conversation.messages.pop();
      }

      // 添加新的空 assistant 消息
      conversation.messages.push({
        role: AssistantRole,
        content: "",
        end: false,
      });
    },
    editMessage: (state, action) => {
      const { id, idx, message } = action.payload as {
        id: number;
        idx: number;
        message: string;
      };
      const conversation = state.conversations[id];
      if (!conversation || conversation.messages.length <= idx) return;

      conversation.messages[idx].content = message;
    },
    stopMessage: (state, action) => {
      const { id } = action.payload as { id: number };
      const conversation = state.conversations[id];
      if (!conversation || conversation.messages.length === 0) return;

      conversation.messages[conversation.messages.length - 1].end = true;
    },
    setLoadingConversation: (state, action) => {
      state.loading_conversation = action.payload as number;
    },
    raiseConversation: (state, action) => {
      // raise conversation `-1` to target id
      const id = action.payload as number;
      const conversation = state.conversations[-1];
      if (!conversation || id === -1) return;

      state.conversations[id] = conversation;
      if (state.current === -1) state.current = id;

      state.conversations[-1] = { ...defaultConversation };
    },
    importConversation: (state, action) => {
      const { conversation, id } = action.payload as {
        conversation: ConversationSerialized;
        id: number;
      };

      if (state.conversations[id]) return;
      state.conversations[id] = conversation;
    },
    deleteConversation: (state, action) => {
      const id = action.payload as number;

      if (id === -1) return;

      state.history = state.history.filter((item) => item.id !== id);

      if (!state.conversations[id]) return;

      if (state.current === id) state.current = -1;
      delete state.conversations[id];
    },
    deleteAllConversation: (state) => {
      state.history = [];

      state.conversations = { [-1]: { ...defaultConversation } };
      state.current = -1;
    },
    setHistory: (state, action) => {
      state.history = action.payload as ConversationInstance[];
    },
    preflightHistory: (state, action) => {
      const name = action.payload as string;

      // add a new history at the beginning
      state.history = [{ id: -1, name, message: [] }, ...state.history];
    },
    renameHistory: (state, action) => {
      const { id, name } = action.payload as { id: number; name: string };
      const conversation = state.history.find((item) => item.id === id);
      if (conversation) conversation.name = name;
    },
    setModel: (state, action) => {
      const model = action.payload as string;
      if (!model || model === "") return;
      if (!inModel(state.support_models, model)) return;

      // if model is not in model list, add it
      // if (!state.model_list.includes(model)) {
      //   console.log("[model] auto add model to list:", model);
      //   state.model_list.push(model);
      //   setArrayMemory("model_mark_list", state.model_list);
      // }

      setMemory("model", model as string);
      state.model = action.payload as string;
    },
    setWeb: (state, action) => {
      setMemory("web", action.payload ? "true" : "false");
      state.web = action.payload as boolean;
    },
    toggleWeb: (state) => {
      const web = !state.web;
      setMemory("web", web ? "true" : "false");
      state.web = web;
    },
    setThink: (state, action) => {
      setMemory("think", action.payload ? "true" : "false");
      state.think = action.payload as boolean;
    },
    toggleThink: (state) => {
      const think = !state.think;
      setMemory("think", think ? "true" : "false");
      state.think = think;
    },
    setCurrent: (state, action) => {
      const current = action.payload as number;
      state.current = current;

      const conversation = state.conversations[current];
      if (!conversation) return;
      if (
        conversation.model &&
        inModel(state.support_models, conversation.model)
      ) {
        state.model = conversation.model;
      }
    },
    setModelList: (state, action) => {
      const models = action.payload as string[];
      state.model_list = models.filter((item) =>
        inModel(state.support_models, item),
      );
      setArrayMemory("model_mark_list", models);
    },
    addModelList: (state, action) => {
      const model = action.payload as string;
      if (
        inModel(state.support_models, model) &&
        !state.model_list.includes(model)
      ) {
        state.model_list.push(model);
        setArrayMemory("model_mark_list", state.model_list);
      }
    },
    removeModelList: (state, action) => {
      const model = action.payload as string;
      if (
        inModel(state.support_models, model) &&
        state.model_list.includes(model)
      ) {
        state.model_list = state.model_list.filter((item) => item !== model);
        setArrayMemory("model_mark_list", state.model_list);
      }
    },
    setMaskItem: (state, action) => {
      state.mask_item = action.payload as Mask;
    },
    clearMaskItem: (state) => {
      state.mask_item = null;
    },
    setCustomMasks: (state, action) => {
      state.custom_masks = action.payload as CustomMask[];
    },
    setSupportModels: (state, action) => {
      const models = action.payload as Model[];

      state.support_models = models;
      state.model = getModel(models, getMemory("model"));
      state.model_list = getModelList(
        models,
        getArrayMemory("model_mark_list"),
        getMemory("model"),
      );

      setOfflineModels(models);
    },
  },
});

export const {
  setHistory,
  renameHistory,
  setCurrent,
  setLoadingConversation,
  setModel,
  setWeb,
  setThink,
  toggleWeb,
  toggleThink,
  setModelList,
  addModelList,
  removeModelList,
  setCustomMasks,
  setSupportModels,
  setMaskItem,
  clearMaskItem,
  fillMaskItem,
  createMessage,
  updateMessage,
  removeMessage,
  restartMessage,
  editMessage,
  stopMessage,
  raiseConversation,
  importConversation,
  deleteConversation,
  deleteAllConversation,
  preflightHistory,
} = chatSlice.actions;
export const selectHistory = (state: RootState): ConversationInstance[] =>
  state.chat.history;
export const selectConversations = (
  state: RootState,
): Record<number, ConversationSerialized> => state.chat.conversations;
export const selectModel = (state: RootState): string => state.chat.model;
export const selectWeb = (state: RootState): boolean => state.chat.web;
export const selectThink = (state: RootState): boolean => state.chat.think;
export const selectCurrent = (state: RootState): number => state.chat.current;
export const selectLoadingConversation = (state: RootState): number =>
  (state.chat as any).loading_conversation ?? -1;
export const selectModelList = (state: RootState): string[] =>
  state.chat.model_list;
export const selectCustomMasks = (state: RootState): CustomMask[] =>
  state.chat.custom_masks;
export const selectSupportModels = (state: RootState): Model[] =>
  state.chat.support_models;
export const selectMaskItem = (state: RootState): Mask | null =>
  state.chat.mask_item;

export function useConversation(): ConversationSerialized | undefined {
  const conversations = useSelector(selectConversations);
  const current = useSelector(selectCurrent);

  return useMemo(() => conversations[current], [conversations, current]);
}

export function useConversationActions() {
  const dispatch = useDispatch<AppDispatch>();
  const conversations = useSelector(selectConversations);
  const current = useSelector(selectCurrent);
  const mask = useSelector(selectMaskItem);
  const loadingConversation = useSelector(selectLoadingConversation);

  return {
    cancelLoading: () => {
      toggleAbortController?.abort();
      toggleAbortController = null;
      dispatch(setLoadingConversation(-1));
    },
    toggle: async (id: number) => {
      if (loadingConversation !== -1 && loadingConversation !== id) return;

      const conversation = conversations[id];
      setNumberMemory("history_conversation", id);

      let loaded: ConversationSerialized | undefined = undefined;
      if (!conversation) {
        dispatch(setLoadingConversation(id));
        toggleAbortController?.abort();
        const controller = new AbortController();
        toggleAbortController = controller;

        let cancelled = false;
        try {
          const data = await loadConversation(id, controller.signal);
          const props: ConversationSerialized = {
            model: data.model,
            messages: data.message,
          };
          loaded = props;
          dispatch(
            importConversation({
              conversation: props,
              id,
            }),
          );
        } catch (e: any) {
          if (
            controller.signal.aborted ||
            e?.code === "ERR_CANCELED" ||
            e?.name === "CanceledError" ||
            e?.name === "AbortError"
          ) {
            cancelled = true;
          }
        } finally {
          if (toggleAbortController === controller) {
            toggleAbortController = null;
          }
          dispatch(setLoadingConversation(-1));
        }

        if (cancelled) return;
      }

      // refresh/enter conversation: if there is an active session, resume streaming
      try {
        const resp = await getConversationSession(id);
        const session = resp.status ? resp.data : undefined;
        if (
          session &&
          (session.status === "pending" || session.status === "processing") &&
          session.session_id
        ) {
          const latestConversation = conversations[id] ?? loaded;
          const latestMessage =
            latestConversation?.messages?.[
              (latestConversation?.messages?.length ?? 0) - 1
            ];

          const needPlaceholder =
            !latestMessage ||
            latestMessage.role !== AssistantRole ||
            latestMessage.end === true;

          if (needPlaceholder) {
            dispatch(
              createMessage({
                id,
                role: AssistantRole,
                content: "",
              }),
            );
          }

          dispatch(startSession(session.session_id, id, session.model));
        }
      } catch {
        // ignore resume errors
      }

      if (current === -1 && conversations[-1].messages.length === 0) {
        // current is mask, clear mask
        mask && dispatch(clearMaskItem());
      }

      dispatch(setCurrent(id));
    },
    rename: async (id: number, name: string) => {
      const resp = await doRenameConversation(id, name);
      resp.status && dispatch(renameHistory({ id, name }));

      return resp;
    },
    remove: async (id: number) => {
      const state = await doDeleteConversation(id);
      state && dispatch(deleteConversation(id));

      return state;
    },
    removeAll: async () => {
      const state = await doDeleteAllConversations();
      state && dispatch(deleteAllConversation());

      return state;
    },
    refresh: async () => {
      const resp = await getConversationList();
      dispatch(setHistory(resp));

      return resp;
    },
    mask: (mask: Mask) => {
      dispatch(setMaskItem(mask));

      if (current !== -1) {
        dispatch(setCurrent(-1));
      }
    },
    selected: (model?: string) => {
      dispatch(setModel(model ?? ""));
    },
  };
}

export function useThinkingSettings() {
  const think = useSelector(selectThink);
  const model = useSelector(selectModel);
  const supportModels = useSelector(selectSupportModels);

  return useMemo(() => {
    const currentModel = supportModels.find((item) => item.id === model);
    const supportsThinking = !!currentModel?.thinking_model;
    const allowUserControl =
      supportsThinking && !!currentModel?.allow_user_think;
    const active = supportsThinking ? (allowUserControl ? think : true) : false;

    return {
      supportsThinking,
      allowUserControl,
      active,
      preference: think,
    };
  }, [supportModels, model, think]);
}

export function useMessageActions() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { refresh } = useConversationActions();
  const current = useSelector(selectCurrent);
  const conversations = useSelector(selectConversations);
  const mask = useSelector(selectMaskItem);

  const model = useSelector(selectModel);
  const web = useSelector(selectWeb);
  const history = useSelector(historySelector);
  const context = useSelector(contextSelector);
  const max_tokens = useSelector(maxTokensSelector);
  const temperature = useSelector(temperatureSelector);
  const top_p = useSelector(topPSelector);
  const top_k = useSelector(topKSelector);
  const presence_penalty = useSelector(presencePenaltySelector);
  const frequency_penalty = useSelector(frequencyPenaltySelector);
  const repetition_penalty = useSelector(repetitionPenaltySelector);
  const { supportsThinking, active: thinkActive } = useThinkingSettings();
  const thinkPayload = supportsThinking ? thinkActive : undefined;

  return {
    send: async (message: string, using_model?: string) => {
      if (current === -1 && conversations[-1].messages.length === 0) {
        // preflight history if it's a new conversation
        dispatch(preflightHistory(message));
      }

      if (!stack.hasConnection(current)) {
        const conn = stack.createConnection(current);

        if (current === -1 && mask && mask.context.length > 0) {
          conn.sendMaskEvent(t, mask);
          dispatch(fillMaskItem());
        }
      }

      const payload: ChatProps = {
        type: "chat",
        message,
        web,
        model: using_model || model,
        context: history,
        ignore_context: !context,
        max_tokens,
        temperature,
        top_p,
        top_k,
        presence_penalty,
        frequency_penalty,
        repetition_penalty,
      };
      if (thinkPayload !== undefined) {
        payload.think = thinkPayload;
      }

      const state = stack.send(current, t, payload);
      if (!state) return false;

      dispatch(
        createMessage({ id: current, role: UserRole, content: message }),
      );
      dispatch(createMessage({ id: current, role: AssistantRole }));

      return true;
    },
    stop: () => {
      if (!stack.hasConnection(current)) return;
      stack.sendStopEvent(current, t);
      dispatch(stopMessage(current));
    },
    restart: () => {
      if (!stack.hasConnection(current)) {
        stack.createConnection(current);
      }
      const restartPayload: ChatProps = {
        web,
        model,
        context: history,
        ignore_context: !context,
        max_tokens,
        temperature,
        top_p,
        top_k,
        presence_penalty,
        frequency_penalty,
        repetition_penalty,
        message: "",
      };
      if (thinkPayload !== undefined) {
        restartPayload.think = thinkPayload;
      }
      stack.sendRestartEvent(current, t, restartPayload);

      // remove the last message if it's from assistant and create a new message
      dispatch(restartMessage(current));
    },
    remove: (idx: number) => {
      if (idx < 0 || idx >= conversations[current].messages.length) return;

      dispatch(removeMessage({ id: current, idx }));

      if (!stack.hasConnection(current)) stack.createConnection(current);
      stack.sendRemoveEvent(current, t, idx);
    },
    edit: (idx: number, message: string) => {
      if (idx < 0 || idx >= conversations[current].messages.length) return;

      dispatch(editMessage({ id: current, idx, message }));
      if (!stack.hasConnection(current)) stack.createConnection(current);
      stack.sendEditEvent(current, t, idx, message);
    },
    receive: async (id: number, message: StreamMessage) => {
      dispatch(updateMessage({ id, message }));

      // raise conversation if it is -1
      if (id === -1 && message.conversation) {
        const target: number = message.conversation;
        dispatch(raiseConversation(target));
        setNumberMemory("history_conversation", target);
        stack.raiseConnection(target);
        await refresh();
      }

      // 处理会话ID，如果消息包含session_id，则创建或更新会话
      if (message.session_id && message.conversation) {
        dispatch(
          startSession(message.session_id, message.conversation, model) as any,
        );
      }
    },
  };
}

export function useMessageEvent() {
  const actions = useMessageActions();

  return (e: ConnectionEvent) => {
    console.debug(`[conversation] receive event: ${e.event} (id: ${e.id})`);

    switch (e.event) {
      case "stop":
        actions.stop();
        break;
      case "restart":
        actions.restart();
        break;
      case "remove":
        actions.remove(e.index ?? -1);
        break;
      case "edit":
        actions.edit(e.index ?? -1, e.message ?? "");
        break;
    }
  };
}

export function useMessages(): Message[] {
  const conversations = useSelector(selectConversations);
  const current = useSelector(selectCurrent);
  const mask = useSelector(selectMaskItem);

  return useMemo(() => {
    const messages = conversations[current]?.messages || [];
    const showMask = current === -1 && mask && messages.length === 0;
    return !showMask ? messages : mask?.context;
  }, [conversations, current, mask]);
}

export function useWorking(): boolean {
  const messages = useMessages();

  return useMemo(() => {
    if (messages.length === 0) return false;

    const last = messages[messages.length - 1];
    if (last.role !== AssistantRole || last.end === undefined) return false;
    return !last.end;
  }, [messages]);
}

export const updateMasks = async (dispatch: AppDispatch) => {
  const resp = await listMasks();
  resp.data && resp.data.length > 0 && dispatch(setCustomMasks(resp.data));

  return resp;
};

export const updateSupportModels = (dispatch: AppDispatch, models: Model[]) => {
  dispatch(setSupportModels(loadPreferenceModels(models)));
};

export default chatSlice.reducer;
