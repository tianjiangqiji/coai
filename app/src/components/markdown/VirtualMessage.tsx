import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useConversationActions,
  useMessageActions,
  useWorking,
} from "@/store/chat.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { DialogClose } from "@radix-ui/react-dialog";
import {
  Eye,
  EyeOff,
  Loader2,
  Maximize,
  RefreshCcwDot,
  Wand2,
} from "lucide-react";

function getVirtualIcon(command: string) {
  command = command.toLowerCase();

  if (
    command.includes("variant") ||
    (command.includes("variation") &&
      !(
        command.includes("high_variation") || command.includes("low_variation")
      ))
  ) {
    return <Wand2 className="h-4 w-4 inline-block mr-2" />;
  } else if (command.includes("upscale") || command.includes("upsample")) {
    return <Maximize className="h-4 w-4 inline-block mr-2" />;
  } else if (command.includes("reroll")) {
    return <RefreshCcwDot className="h-4 w-4 inline-block mr-2" />;
  }
}

function getVirualPrompt(command: string) {
  command = command.toLowerCase();

  if (command.includes("variant") || command.includes("variation")) {
    if (command.includes("low_variation")) return "chat.actions.subtle-vary";
    if (command.includes("high_variation")) return "chat.actions.strong-vary";

    return "chat.actions.variant";
  } else if (command.includes("upscale") || command.includes("upsample")) {
    if (command.includes("subtle")) return "chat.actions.subtle-upscale";
    if (command.includes("creative")) return "chat.actions.creative-upscale";

    return "chat.actions.upscale";
  } else if (command.includes("reroll")) {
    return "chat.actions.reroll";
  } else if (command.includes("inpaint")) {
    return "chat.actions.region-vary";
  } else if (command.includes("outpaint") || command.includes("customzoom")) {
    if (command.includes("custom")) return "chat.actions.zoom-custom";

    if (command.includes("50")) return "chat.actions.zoom-2x";
    if (command.includes("75")) return "chat.actions.zoom-1.5x";

    return "chat.actions.zoom";
  } else if (command.includes("bookmark")) {
    return "chat.actions.bookmark";
  } else if (command.includes("pan_")) {
    if (command.includes("pan_left")) return "chat.actions.pan-left";
    if (command.includes("pan_right")) return "chat.actions.pan-right";
    if (command.includes("pan_up")) return "chat.actions.pan-up";
    if (command.includes("pan_down")) return "chat.actions.pan-down";
  }
}

function GetI18nPrompt({ command }: { command: string }) {
  const { t } = useTranslation();
  
  const prompt = getVirualPrompt(command);
  if (!prompt) return null;
  
  return <>{t(prompt)}</>;
}

type VirtualPromptProps = {
  message: string;
  children: React.ReactNode;
};

function VirtualPrompt({ message, children }: VirtualPromptProps) {
  const [raw, setRaw] = useState<boolean>(false);
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRaw(!raw);
  };

  const Comp = () => (
    <>
      {getVirtualIcon(message)}
      {children} <GetI18nPrompt command={message} />
    </>
  );

  return (
    <div
      className={`virtual-prompt flex flex-row items-center justify-center select-none`}
    >
      {raw ? message : <Comp />}

      {!raw ? (
        <Eye
          className={`h-4 w-4 mx-2 cursor-pointer shrink-0`}
          onClick={toggle}
        />
      ) : (
        <EyeOff
          className={`h-4 w-4 mx-2 cursor-pointer shrink-0`}
          onClick={toggle}
        />
      )}
    </div>
  );
}

type VirtualMessageProps = {
  message: string;
  children: React.ReactNode;
};

function parseMessage(message: string): { prompt: string; model: string } {
  const segments = message.split("::");
  const model = segments.length > 1 ? segments[segments.length - 1] : "";
  const prompt = decodeURIComponent(
    segments.slice(0, segments.length - 1).join("::"),
  );

  return { prompt, model };
}

export function VirtualMessage({ message, children }: VirtualMessageProps) {
  const { t } = useTranslation();
  const { selected } = useConversationActions();
  const { send: sendAction } = useMessageActions();
  const working = useWorking();
  const [isHovered, setIsHovered] = useState(false);

  const { prompt, model } = parseMessage(message);
  
  if (prompt === "reference") {
    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      let targetUrl = decodeURIComponent(model);
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    };
    
    return (
      <span 
        className={`inline-flex items-center justify-center h-[18px] px-[6px] py-0
                  text-[12px] font-normal 
                  ${isHovered ? 'bg-[#d0d0d0] text-[#202020]' : 'bg-[#e5e5e5] text-[#404040]'}
                  rounded-[9px] cursor-pointer relative -top-[2px] ml-1
                  font-variant-numeric tabular-nums align-middle flex-shrink-0
                  transition-colors duration-150`}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {children}
      </span>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={`outline`}
          className={`flex flex-row items-center virtual-action mx-1 my-0.5 min-w-[4rem]`}
        >
          {getVirtualIcon(message)}
          {children}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("chat.send-message")}</DialogTitle>
          <DialogDescription className={`pb-2`}>
            {t("chat.send-message-desc")}
          </DialogDescription>
          <VirtualPrompt message={prompt}>{children}</VirtualPrompt>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant={`outline`}>{t("cancel")}</Button>
          </DialogClose>
          <DialogClose
            disabled={working}
            onClick={async () => {
              selected(model);
              await sendAction(prompt, model);
            }}
            asChild
          >
            <Button unClickable variant={`default`}>
              {working && <Loader2 className={`h-4 w-4 mr-1.5 animate-spin`} />}
              {t("confirm")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
