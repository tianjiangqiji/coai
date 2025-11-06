import { mobile } from "@/utils/device.ts";
import { filterMessage } from "@/utils/processor.ts";
import { setMenu } from "@/store/menu.ts";
import {
  Loader2,
  MessageSquare,
  MessagesSquare,
  MoreHorizontal,
  PencilLine,
  Share2,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { ConversationInstance } from "@/api/types.tsx";
import { useState } from "react";
import { useConversationActions } from "@/store/chat.ts";
import { cn } from "@/components/ui/lib/utils.ts";
import PopupDialog, { popupTypes } from "@/components/PopupDialog.tsx";
import { withNotify } from "@/api/common.ts";
import Clickable from "@/components/ui/clickable.tsx";

type ConversationItemProps = {
  conversation: ConversationInstance;
  current: number;
  operate: (conversation: {
    target: ConversationInstance;
    type: string;
  }) => void;
};
function ConversationItem({
  conversation,
  current,
  operate,
}: ConversationItemProps) {
  const dispatch = useDispatch();
  const { toggle } = useConversationActions();
  const { t } = useTranslation();
  const { rename } = useConversationActions();
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);

  const [editDialog, setEditDialog] = useState(false);

  const loading = conversation.id <= 0;

  return (
    <Clickable
      tapScale={0.975}
      tapDuration={0.01}
      className={cn("conversation", current === conversation.id && "active")}
      onClick={async (e) => {
        const target = e.target as HTMLElement;
        if (
          target.classList.contains("delete") ||
          target.parentElement?.classList.contains("delete")
        )
          return;
        await toggle(conversation.id);
        if (mobile) dispatch(setMenu(false));
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }}
    >
      <MessageSquare
        className={`h-6 w-6 p-1 mr-1 text-secondary bg-input/25 rounded-sm`}
      />
      <div className={`title`}>{filterMessage(conversation.name)}</div>
      <DropdownMenu
        open={open}
        onOpenChange={(state: boolean) => {
          setOpen(state);
          if (state) setOffset(new Date().getTime());
        }}
      >
        <DropdownMenuTrigger
          className={`flex flex-row outline-none`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className={cn("id", loading && "loading")}>
            {loading ? (
              <Loader2 className={`mr-0.5 h-4 w-4 animate-spin`} />
            ) : (
              <MoreHorizontal className={`h-4 w-4 mr-0.5`} />
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={`end`}>
          <DropdownMenuLabel
            className={`inline-flex conversation-id text-left py-0.5 w-full`}
          >
            {conversation.id}

            <MessagesSquare
              className={`inline h-3.5 w-3.5 ml-auto translate-y-0.5 text-secondary`}
            />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <PopupDialog
            title={t("conversation.edit-title")}
            open={editDialog}
            setOpen={setEditDialog}
            type={popupTypes.Text}
            name={t("title")}
            defaultValue={conversation.name}
            onSubmit={async (name) => {
              const resp = await rename(conversation.id, name);
              withNotify(t, resp, true);
              if (!resp.status) return false;

              setEditDialog(false);
              return true;
            }}
          />
          <DropdownMenuItem
            onClick={(e) => {
              // prevent click event from opening the dropdown menu
              if (offset + 500 > new Date().getTime()) return;

              e.preventDefault();
              e.stopPropagation();

              setEditDialog(true);
            }}
          >
            <PencilLine className={`h-4 w-4 mx-1`} />
            {t("conversation.edit-title")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              operate({ target: conversation, type: "share" });

              setOpen(false);
            }}
          >
            <Share2 className={`h-4 w-4 mx-1`} />
            {t("share.share-conversation")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              operate({ target: conversation, type: "delete" });

              setOpen(false);
            }}
          >
            <Trash2 className={`h-4 w-4 mx-1`} />
            {t("conversation.delete-conversation")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Clickable>
  );
}

export default ConversationItem;
