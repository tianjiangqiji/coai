import {
  selectWeb,
  toggleWeb,
  useConversationActions,
  useMessages,
} from "@/store/chat.ts";
import { Globe, Info, MessageSquarePlus, Wifi, WifiOff } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import React from "react";
import { cn } from "@/components/ui/lib/utils.ts";
import { toast } from "sonner";
import Icon from "@/components/utils/Icon.tsx";
import { Button } from "@/components/ui/button.tsx";
import Clickable from "@/components/ui/clickable.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";

type ChatActionProps = {
  style?: React.CSSProperties;
  className?: string;
  text?: string;
  active?: boolean | number;
  show?: boolean;
  children?: React.ReactElement;
  onClick?: () => void;
};

export const ChatAction = ({
  className,
  text,
  children,
  active,
  show = true,
  onClick,
  ...props
}: ChatActionProps) => {
  return (
    <div className={cn(
      "transition-all duration-300",
      !show && "opacity-0 pointer-events-none invisible"
    )}>
      <TooltipProvider>
        <Tooltip delayDuration={250}>
          <TooltipTrigger>
            <Clickable tapScale={0.9}>
              <Button
                size={`icon-sm`}
                variant={`ghost`}
                className={cn(
                  "group hover:bg-muted-foreground/5 mr-1",
                  active && `bg-muted-foreground/10 hover:bg-muted-foreground/20`,
                  className,
                )}
                onClick={onClick}
                {...props}
              >
                <Icon
                  icon={children}
                  className={cn(
                    `h-[1.125rem] w-[1.125rem] text-unread transition shrink-0 stroke-[2]`,
                    active && "text-primary",
                  )}
                />
              </Button>
            </Clickable>
          </TooltipTrigger>
          <TooltipContent>{text}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export function WebAction() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const web = useSelector(selectWeb);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <ChatAction
            active={web}
            text={t("chat.web")}
          >
            <Globe className={cn("h-4 w-4 web", web && "enable")} />
          </ChatAction>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        side="top"
        align="start"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="web-search-toggle" className="text-sm">{t("chat.web-search")}</Label>
            <Switch
              id="web-search-toggle"
              checked={web}
              onCheckedChange={() => {
                toast(t("chat.web-search"), {
                  description: (
                    <div className={`flex flex-col`}>
                      <div className={`flex flex-row items-center flex-wrap`}>
                        <Icon
                          icon={!web ? <Wifi /> : <WifiOff />}
                          className={`h-4 w-4 mr-1 shrink-0`}
                        />
                        {!web
                          ? t("chat.web-enable-toast")
                          : t("chat.web-disable-toast")}
                      </div>
                      <div
                        className={`mt-1.5 flex flex-row items-center rounded-md border scale-80 py-1 px-2`}
                      >
                        <Icon icon={<Info />} className={`h-3 w-3 mr-1 shrink-0`} />
                        {t("chat.web-enable-tip")}
                      </div>
                    </div>
                  ),
                });

                dispatch(toggleWeb());
              }}
            />
          </div>

          {web && (
            <></>
          )}
          
          <div className="rounded-md bg-muted p-2 text-xs">
            <div className="flex items-center">
              <Icon icon={<Info />} className="h-3 w-3 mr-1 shrink-0" />
              {t("chat.web-enable-tip")}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function NewConversationAction() {
  const { t } = useTranslation();
  const messages = useMessages();
  const { toggle } = useConversationActions();

  return (
    <ChatAction
      text={t("new-chat")}
      onClick={async () => messages.length > 0 && (await toggle(-1))}
    >
      <MessageSquarePlus className={`h-4 w-4`} />
    </ChatAction>
  );
}
