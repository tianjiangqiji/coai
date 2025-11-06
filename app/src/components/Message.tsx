import { Message, UserRole } from "@/api/types.tsx";
import Markdown from "@/components/Markdown.tsx";
import {
  CalendarCheck2,
  CircleSlash,
  Cloud,
  CloudCog,
  Copy,
  File,
  Loader2,
  SquareMousePointer,
  PencilLine,
  Power,
  RotateCcw,
  Trash,
} from "lucide-react";
import { filterMessage } from "@/utils/processor.ts";
import {
  copyClipboard,
  isContainDom,
  saveAsFile,
} from "@/utils/dom.ts";
import { useTranslation } from "react-i18next";
import React, { Ref, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import EditorProvider from "@/components/EditorProvider.tsx";
import Avatar from "@/components/Avatar.tsx";
import { useSelector } from "react-redux";
import { selectUsername } from "@/store/auth.ts";
import { appLogo } from "@/conf/env.ts";
import { motion } from "framer-motion";
import { ThinkContent } from "@/components/ThinkContent";

type MessageProps = {
  index: number;
  message: Message;
  end?: boolean;
  username?: string;
  onEvent?: (event: string, index?: number, message?: string) => void;
  ref?: Ref<HTMLElement>;
  sharing?: boolean;

  selected?: boolean;
  onFocus?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onFocusLeave?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
};

function MessageSegment(props: MessageProps) {
  const ref = useRef(null);
  const { message } = props;

  return (
    <div
      className={`message ${message.role}`}
      ref={ref}
      onClick={props.onFocus}
      onMouseEnter={props.onFocus}
      onMouseLeave={(event) => {
        try {
          if (isContainDom(ref.current, event.relatedTarget as HTMLElement))
            return;
          props.onFocusLeave && props.onFocusLeave(event);
        } catch (e) {
          console.debug(`[message] cannot leave focus: ${e}`);
        }
      }}
    >
      <MessageContent {...props} />
      <MessageQuota message={message} />
    </div>
  );
}

type MessageQuotaProps = {
  message: Message;
};

function MessageQuota({ message }: MessageQuotaProps) {
  const [detail, setDetail] = useState(false);

  if (message.role === UserRole) return null;

  return (
    message.quota &&
    message.quota !== 0 && (
      <motion.div
        className={cn("message-quota", message.plan && "subscription")}
        onClick={() => setDetail(!detail)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: detail ? 360 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {message.plan ? (
            <CalendarCheck2 className={`h-4 w-4 icon`} />
          ) : detail ? (
            <CloudCog className={`h-4 w-4 icon`} />
          ) : (
            <Cloud className={`h-4 w-4 icon`} />
          )}
        </motion.div>
        <motion.span
          className={`quota`}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          {(message.quota < 0 ? 0 : message.quota).toFixed(detail ? 6 : 2)}
        </motion.span>
      </motion.div>
    )
  );
}

type MessageMenuProps = {
  children?: React.ReactNode;
  message: Message;
  end?: boolean;
  index: number;
  onEvent?: (event: string, index?: number, message?: string) => void;
  editedMessage?: string;
  setEditedMessage: (message: string) => void;
  setOpen: (open: boolean) => void;
  align?: "start" | "end";
};

function MessageMenu({
  children,
  align,
  message,
  end,
  index,
  onEvent,
  editedMessage,
  setEditedMessage,
  setOpen,
}: MessageMenuProps) {
  const { t } = useTranslation();
  const isAssistant = message.role === "assistant";
  const notInOutput = message.end !== false;
  const disableDelete = isAssistant && end && !notInOutput;
  const [dropdown, setDropdown] = useState(false);

  return (
    <DropdownMenu open={dropdown} onOpenChange={setDropdown}>
      <DropdownMenuTrigger className={cn(`flex flex-row outline-none`)}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {isAssistant && end ? (
          <DropdownMenuItem
            onClick={() => {
              onEvent && onEvent(message.end !== false ? "restart" : "stop");
              setDropdown(false);
            }}
          >
            {notInOutput ? (
              <>
                <RotateCcw className={`h-4 w-4 mr-1.5`} />
                {t("message.restart")}
              </>
            ) : (
              <>
                <Power className={`h-4 w-4 mr-1.5`} />
                {t("message.stop")}
              </>
            )}
          </DropdownMenuItem>
        ) : (
          notInOutput && (
            <DropdownMenuItem
              onClick={() => {
                onEvent && onEvent("restart");
                setDropdown(false);
              }}
            >
              <RotateCcw className={`h-4 w-4 mr-1.5`} />
              {t("message.restart")}
            </DropdownMenuItem>
          )
        )}
        <DropdownMenuItem
          onClick={() => copyClipboard(filterMessage(message.content))}
        >
          <Copy className={`h-4 w-4 mr-1.5`} />
          {t("message.copy")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const input = document.getElementById("input") as HTMLInputElement;
            if (input) {
              input.value = filterMessage(message.content);
              input.focus();
            }
          }}
        >
          <SquareMousePointer className={`h-4 w-4 mr-1.5`} />
          {t("message.use")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disableDelete}
          onClick={() => {
            editedMessage?.length === 0 && setEditedMessage(message.content);
            setOpen(true);
          }}
        >
          <PencilLine className={`h-4 w-4 mr-1.5`} />
          {t("message.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={disableDelete}
          onClick={() => onEvent && onEvent("remove", index)}
        >
          <Trash className={`h-4 w-4 mr-1.5`} />
          {t("message.remove")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            saveAsFile(
              `message-${message.role}.txt`,
              filterMessage(message.content),
            )
          }
        >
          <File className={`h-4 w-4 mr-1.5`} />
          {t("message.save")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MessageContent({
  message,
  end,
  index,
  onEvent,
  selected,
  username,
}: MessageProps) {
  const isUser = message.role === "user";
  const hasContent = message.content.length > 0;
  const isAssistant = message.role === "assistant";
  const isOutput = message.end === false;
  const user = useSelector(selectUsername);

  const [open, setOpen] = useState(false);
  const [editedMessage, setEditedMessage] = useState<string | undefined>("");

  // parse think content
  const parseThinkContent = (content: string) => {
    // check if there is a start tag

    const startMatch = content.match(/<think>\n?(.*?)(?:<\/think>|$)/s);
    if (startMatch) {
      const thinkContent = startMatch[1];
      // if there is an end tag, remove the whole matching part;
      // if not, keep the remaining content
      const hasEndTag = content.includes('</think>');
      const restContent = hasEndTag ? 
        content.replace(startMatch[0], "").trim() :
        content.substring(content.indexOf('<think>') + 7).trim();
      
      return {
        thinkContent,
        restContent: hasEndTag ? restContent : '',
        isComplete: hasEndTag
      };
    }
    return null;
  };

  const parsedContent = message.content.length ? parseThinkContent(message.content) : null;

  return (
    <div className={"content-wrapper"}>
      <EditorProvider
        submittable={true}
        onSubmit={(value) => onEvent && onEvent("edit", index, value)}
        open={open}
        setOpen={setOpen}
        value={editedMessage ?? ""}
        onChange={setEditedMessage}
      />
      <div className={`message-avatar-wrapper`}>
        {!selected ? (
          isUser ? (
            <Avatar
              className={`message-avatar animate-fade-in`}
              username={username ?? user}
            />
          ) : (
            <img
              src={appLogo}
              alt={``}
              className={`message-avatar animate-fade-in`}
            />
          )
        ) : (
          <MessageMenu
            message={message}
            end={end}
            index={index}
            onEvent={onEvent}
            editedMessage={editedMessage}
            setEditedMessage={setEditedMessage}
            setOpen={setOpen}
            align={isUser ? "end" : "start"}
          >
            <div
              className={`message-avatar flex flex-row items-center justify-center cursor-pointer select-none opacity-0 animate-fade-in`}
            >
              <PencilLine className={`h-4 w-4`} />
            </div>
          </MessageMenu>
        )}
      </div>
      <div
        className={`relative message-content dark:bg-muted/40 border dark:border-transparent hover:border-border`}
      >
        {hasContent ? (
          <>
            {parsedContent ? (
              <>
                <ThinkContent 
                  content={parsedContent.thinkContent} 
                  isComplete={parsedContent.isComplete}
                />
                {parsedContent.restContent && (
                  <Markdown
                    loading={message.end === false}
                    children={message.content}
                    acceptHtml={false}
                  />
                )}
              </>
            ) : (
              <Markdown
                loading={message.end === false}
                children={message.content}
                acceptHtml={false}
              />
            )}
          </>
        ) : message.end === true ? (
          <CircleSlash className={`h-5 w-5 m-1`} />
        ) : (
          <Loader2 className={`h-5 w-5 m-1 animate-spin`} />
        )}

        {isAssistant && hasContent && isOutput && (
          <Loader2
            className={`absolute right-0 bottom-0 h-3.5 w-3.5 m-1 animate-spin`}
          />
        )}
      </div>
    </div>
  );
}

export default MessageSegment;
