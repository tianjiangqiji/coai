import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import FileAction from "@/components/FileProvider.tsx";
import { useSelector } from "react-redux";
import { selectAuthenticated, selectInit } from "@/store/auth.ts";
import {
  listenMessageEvent,
  selectCurrent,
  selectModel,
  selectSupportModels,
  useMessageActions,
  useMessages,
  useWorking,
} from "@/store/chat.ts";
import { formatMessage } from "@/utils/processor.ts";
import ChatInterface from "@/components/home/ChatInterface.tsx";
import { clearHistoryState, getQueryParam } from "@/utils/path.ts";
import { forgetMemory, popMemory } from "@/utils/memory.ts";
import { alignSelector } from "@/store/settings.ts";
import { FileArray } from "@/api/file.ts";
import {
  NewConversationAction,
  WebAction,
} from "@/components/home/assemblies/ChatAction.tsx";
import ChatSpace from "@/components/home/ChatSpace.tsx";
import ActionButton, {
  ActionCommand,
} from "@/components/home/assemblies/ActionButton.tsx";
import ChatInput from "@/components/home/assemblies/ChatInput.tsx";
import ScrollAction from "@/components/home/assemblies/ScrollAction.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import { goAuth } from "@/utils/app.ts";
import { getModelFromId } from "@/conf/model.ts";
import { ModelArea } from "@/components/home/ModelArea.tsx";
import { toast } from "sonner";
import { VoiceAction } from "@/components/VoiceProvider.tsx";
import { AnimatePresence, motion } from "framer-motion";

type InterfaceProps = {
  scrollable: boolean;
  setTarget: (instance: HTMLElement | null) => void;
};

function Interface(props: InterfaceProps) {
  const messages = useMessages();
  return messages.length > 0 ? <ChatInterface {...props} /> : <ChatSpace />;
}

function fileReducer(state: FileArray, action: Record<string, any>): FileArray {
  switch (action.type) {
    case "add":
      return [...state, action.payload];
    case "remove":
      return state.filter((_, i) => i !== action.payload);
    case "clear":
      return [];
    default:
      return state;
  }
}

function ChatWrapper() {
  const { t } = useTranslation();
  const { send: sendAction } = useMessageActions();
  const process = listenMessageEvent();
  const [files, fileDispatch] = useReducer(fileReducer, []);
  const [input, setInput] = useState("");
  const [visible, setVisibility] = useState(false);
  const init = useSelector(selectInit);
  const current = useSelector(selectCurrent);
  const auth = useSelector(selectAuthenticated);
  const model = useSelector(selectModel);
  const target = useRef(null);
  const align = useSelector(alignSelector);

  const working = useWorking();
  const supportModels = useSelector(selectSupportModels);

  const requireAuth = useMemo(
    (): boolean => !!getModelFromId(supportModels, model)?.auth,
    [model],
  );

  const [instance, setInstance] = useState<HTMLElement | null>(null);

  function clearFile() {
    fileDispatch({ type: "clear" });
  }

  async function processSend(
    data: string,
    passAuth?: boolean,
  ): Promise<boolean> {
    if (requireAuth && !auth && !passAuth) {
      toast(t("login-require"), {
        description: t("login-require-prompt"),
        action: {
          label: t("login"),
          onClick: goAuth,
        },
      });
      return false;
    }

    if (working) return false;

    const message: string = formatMessage(files, data);
    if (message.length > 0 && data.trim().length > 0) {
      if (await sendAction(message)) {
        forgetMemory("history");
        clearFile();
        return true;
      }
    }
    return false;
  }

  async function handleSend() {
    // because of the function wrapper, we need to update the selector state using props.
    if (await processSend(input)) {
      setInput("");
    }
  }

  async function handleCancel() {
    process({ id: current, event: "stop" });
  }

  useEffect(() => {
    window.addEventListener("load", () => {
      const el = document.getElementById("input");
      if (el) el.focus();
    });
  }, []);

  useEffect(() => {
    if (!init) return;
    const query = getQueryParam("q").trim();
    if (query.length > 0) processSend(query).then();
    clearHistoryState();
  }, [init]);

  useEffect(() => {
    const history: string = popMemory("history");
    if (history.length) {
      setInput(history);
      toast(t("chat.recall"), {
        description: t("chat.recall-desc"),
        action: {
          label: t("chat.recall-cancel"),
          onClick: () => {
            setInput("");
          },
        },
      });
    }
  }, []);

  return (
    <div className={`chat-container bg-muted/25 dark:bg-muted/10`}>
      <div className={`chat-wrapper`}>
        <Interface setTarget={setInstance} scrollable={!visible} />
        <div className={`chat-input border-t bg-muted/25`}>
          <motion.div
            className={`flex flex-row items-center p-1.5 pb-0.5`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <AnimatePresence key="model">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                <ModelArea />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <WebAction />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <FileAction files={files} dispatch={fileDispatch} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <VoiceAction />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <ScrollAction
                  visible={visible}
                  setVisibility={setVisibility}
                  target={instance}
                />
              </motion.div>
            </AnimatePresence>
            <motion.div
              className={`grow`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            <AnimatePresence key="new">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3, delay: 0.6 }}
              >
                <NewConversationAction />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <div className={`flex flex-col gap-2 px-3 pb-2`}>
            <div className={`relative w-full`}>
              <ChatInput
                className={cn(
                  "rounded-none border-0 bg-transparent w-full",
                  align && "align",
                )}
                target={target}
                value={input}
                onValueChange={setInput}
                onEnterPressed={handleSend}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <ActionCommand input={input} />
              <ActionButton
                working={working}
                onClick={() => (working ? handleCancel() : handleSend())}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatWrapper;
