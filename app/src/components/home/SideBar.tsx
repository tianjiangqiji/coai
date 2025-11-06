import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { selectAuthenticated } from "@/store/auth.ts";
import {
  selectCurrent,
  selectHistory,
  selectMaskItem,
  useConversationActions,
} from "@/store/chat.ts";
import React, { useMemo, useRef, useState } from "react";
import { ConversationInstance } from "@/api/types.tsx";
import { extractMessage, filterMessage } from "@/utils/processor.ts";
import { copyClipboard } from "@/utils/dom.ts";
import { useEffectAsync, useAnimation } from "@/utils/hook.ts";
import { mobile, openWindow } from "@/utils/device.ts";
import { Button } from "@/components/ui/button.tsx";
import { selectMenu, setMenu } from "@/store/menu.ts";
import {
  Copy,
  Eraser,
  Paintbrush,
  Plus,
  RotateCw,
  Search,
  User,
} from "lucide-react";
import ConversationItem from "./ConversationItem.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import { getSharedLink, shareConversation } from "@/api/sharing.ts";
import { Input } from "@/components/ui/input.tsx";
import { goAuth } from "@/utils/app.ts";
import { cn } from "@/components/ui/lib/utils.ts";
import { getNumberMemory } from "@/utils/memory.ts";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

type Operation = {
  target: ConversationInstance | null;
  type: string;
};

type SidebarActionProps = {
  search: string;
  setSearch: (search: string) => void;
  setOperateConversation: (operation: Operation) => void;
};

type ConversationListProps = {
  search: string;
  operateConversation: Operation;
  setOperateConversation: (operation: Operation) => void;
};

function SidebarAction({
  search,
  setSearch,
  setOperateConversation,
}: SidebarActionProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const {
    toggle,
    refresh: refreshAction,
    removeAll: removeAllAction,
  } = useConversationActions();
  const refreshRef = useRef(null);
  const [removeAll, setRemoveAll] = useState<boolean>(false);

  const current = useSelector(selectCurrent);
  const mask = useSelector(selectMaskItem);

  async function handleDeleteAll(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    (await removeAllAction())
      ? toast.success(t("conversation.delete-success"), {
          description: t("conversation.delete-success-prompt"),
        })
      : toast.error(t("conversation.delete-failed"), {
          description: t("conversation.delete-failed-prompt"),
        });

    await refreshAction();
    setOperateConversation({ target: null, type: "" });
    setRemoveAll(false);
  }

  return (
    <motion.div
      className={`sidebar-action-wrapper flex flex-col w-full h-fit px-1.5`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className={`sidebar-action`}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant={`ghost`}
            size={`icon`}
            onClick={async () => {
              await toggle(-1);
              if (mobile) dispatch(setMenu(false));
            }}
          >
            {current === -1 && mask ? (
              <Paintbrush className={`h-4 w-4`} />
            ) : (
              <Plus className={`h-4 w-4`} />
            )}
          </Button>
        </motion.div>
        <div className={`grow`} />
        <AlertDialog open={removeAll} onOpenChange={setRemoveAll}>
          <AlertDialogTrigger asChild>
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button variant={`ghost`} size={`icon`}>
                <Eraser className={`h-4 w-4`} />
              </Button>
            </motion.div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("conversation.remove-all-title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("conversation.remove-all-description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("conversation.cancel")}</AlertDialogCancel>
              <Button
                variant={`destructive`}
                loading={true}
                onClick={handleDeleteAll}
                unClickable
              >
                {t("conversation.delete")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <motion.div whileTap={{ scale: 0.9 }} className={`refresh-action`}>
          <Button
            variant={`ghost`}
            size={`icon`}
            id={`refresh`}
            ref={refreshRef}
            onClick={() => {
              const hook = useAnimation(refreshRef, "active", 500);
              refreshAction().finally(hook);
            }}
          >
            <RotateCw className={`h-4 w-4`} />
          </Button>
        </motion.div>
      </motion.div>
      <motion.div
        className={`relative w-full h-fit`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Search
          className={`absolute h-3.5 w-3.5 top-1/2 left-3.5 transform -translate-y-1/2`}
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("conversation.search")}
          className={`w-full pl-9`}
        />
      </motion.div>
    </motion.div>
  );
}

function SidebarConversationList({
  search,
  operateConversation,
  setOperateConversation,
}: ConversationListProps) {
  const { t } = useTranslation();
  const { remove } = useConversationActions();
  const auth = useSelector(selectAuthenticated);
  const history: ConversationInstance[] = useSelector(selectHistory);
  const [shared, setShared] = useState<string>("");
  const current = useSelector(selectCurrent);

  const filteredHistory = useMemo(() => {
    if (search.trim().length === 0) return history;

    const searchItems = search
      .trim()
      .toLowerCase()
      .split(" ")
      .filter((item) => item.length > 0);

    return history.filter((conversation) => {
      const name = conversation.name.toLowerCase();
      const id = conversation.id.toString();
      return searchItems.every(
        (item) => name.includes(item) || id.includes(item),
      );
    });
  }, [history, search]);

  async function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (await remove(operateConversation?.target?.id || -1))
      toast.success(t("conversation.delete-success"), {
        description: t("conversation.delete-success-prompt"),
      });
    else
      toast.error(t("conversation.delete-failed"), {
        description: t("conversation.delete-failed-prompt"),
      });
    setOperateConversation({ target: null, type: "" });
  }

  async function handleShare(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    const resp = await shareConversation(operateConversation?.target?.id || -1);
    if (resp.status) setShared(getSharedLink(resp.data));
    else
      toast.error(t("share.failed"), {
        description: resp.message,
      });

    setOperateConversation({ target: null, type: "" });
  }

  return (
    <>
      <div className={`conversation-list`}>
        <AnimatePresence>
          {filteredHistory.length ? (
            filteredHistory.map((conversation, i) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <ConversationItem
                  operate={setOperateConversation}
                  conversation={conversation}
                  current={current}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={`empty text-center px-6`}
            >
              {auth
                ? t("conversation.empty")
                : t("conversation.empty-anonymous")}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AlertDialog
        open={
          operateConversation.type === "delete" && !!operateConversation.target
        }
        onOpenChange={(open) => {
          if (!open) setOperateConversation({ target: null, type: "" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("conversation.remove-title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("conversation.remove-description")}
              <strong className={`conversation-name`}>
                {extractMessage(
                  filterMessage(operateConversation?.target?.name || ""),
                )}
              </strong>
              {t("end")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("conversation.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("conversation.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={
          operateConversation.type === "share" && !!operateConversation.target
        }
        onOpenChange={(open) => {
          if (!open) setOperateConversation({ target: null, type: "" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("share.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("share.description")}
              <strong className={`conversation-name`}>
                {extractMessage(
                  filterMessage(operateConversation?.target?.name || ""),
                )}
              </strong>
              {t("end")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("conversation.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleShare}>
              {t("share.title")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={shared.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            setShared("");
            setOperateConversation({ target: null, type: "" });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("share.success")}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className={`share-wrapper mt-4 mb-2`}>
                <Input value={shared} />
                <Button
                  variant={`default`}
                  size={`icon`}
                  onClick={async () => {
                    await copyClipboard(shared);
                    toast.success(t("share.copied"), {
                      description: t("share.copied-description"),
                    });
                  }}
                >
                  <Copy className={`h-4 w-4`} />
                </Button>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("close")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                openWindow(shared, "_blank");
              }}
            >
              {t("share.view")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SideBar() {
  const { t } = useTranslation();
  const { refresh, toggle } = useConversationActions();
  const current = useSelector(selectCurrent);
  const open = useSelector(selectMenu);
  const auth = useSelector(selectAuthenticated);
  const [search, setSearch] = useState<string>("");
  const [operateConversation, setOperateConversation] = useState<Operation>({
    target: null,
    type: "",
  });
  useEffectAsync(async () => {
    const resp = await refresh();

    const store = getNumberMemory("history_conversation", -1);
    if (current === store) return; // no need to dispatch current
    if (store === -1) return; // -1 is default, no need to dispatch
    if (!resp.map((item) => item.id).includes(store)) return; // not in the list, no need to dispatch
    await toggle(store);
  }, []);

  return (
    <div className={cn("sidebar", open && "open")}>
      <div className={`sidebar-content`}>
        <SidebarAction
          search={search}
          setSearch={setSearch}
          setOperateConversation={setOperateConversation}
        />
        <SidebarConversationList
          search={search}
          operateConversation={operateConversation}
          setOperateConversation={setOperateConversation}
        />
        {!auth && (
          <Button
            className={`login-action min-h-10 h-max`}
            variant={`default`}
            onClick={goAuth}
          >
            <User className={`h-4 w-4 mr-1.5 shrink-0`} /> {t("login-action")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default SideBar;
