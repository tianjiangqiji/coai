import "@/assets/pages/sharing.less";
import { useParams } from "react-router-dom";
import { viewConversation, ViewData, ViewForm } from "@/api/sharing.ts";
import { saveImageAsFile } from "@/utils/dom.ts";
import { useEffectAsync } from "@/utils/hook.ts";
import { useRef, useState } from "react";
import {
  ArrowUp,
  Clock,
  Image,
  Loader2,
  Maximize,
  MessagesSquare,
  Minimize,
  Newspaper,
  RssIcon,
  Undo2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import MessageSegment from "@/components/Message.tsx";
import { Button } from "@/components/ui/button.tsx";
import router from "@/router.tsx";
import { Message } from "@/api/types.tsx";
import Avatar from "@/components/Avatar.tsx";
import { toJpeg } from "html-to-image";
import { appLogo, appName } from "@/conf/env.ts";
import { extractMessage } from "@/utils/processor.ts";
import { cn } from "@/components/ui/lib/utils.ts";
import { isMobile, useMobile } from "@/utils/device.ts";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { useConversationActions } from "@/store/chat.ts";
import { toast } from "sonner";
import Emoji from "@/components/Emoji";

type SharingFormProps = {
  refer?: string;
  data: ViewData | null;
};

function SharingForm({ data }: SharingFormProps) {
  if (data === null) return null;

  const { t } = useTranslation();
  const mobile = useMobile();
  const { mask: setMask, selected: setModel } = useConversationActions();
  const [maximized, setMaximized] = useState(isMobile());
  const container = useRef<HTMLDivElement>(null);
  const date = new Date(data.time);
  const time = `${
    date.getMonth() + 1
  }-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;

  const saveImage = async () => {
    toast.info(t("message.saving-image-prompt"), {
      description: t("message.saving-image-prompt-desc"),
    });

    setTimeout(() => {
      if (!container.current) return;
      toJpeg(container.current)
        .then((blob) => {
          saveImageAsFile(`${extractMessage(data.name, 12)}.png`, blob);
          toast.success(t("message.saving-image-success"), {
            description: t("message.saving-image-success-prompt"),
          });
        })
        .catch((reason) => {
          toast.error(t("message.saving-image-failed"), {
            description: t("message.saving-image-failed-prompt", { reason }),
          });
        });
    }, 10);
  };

  return (
    <div
      className={cn(
        "relative flex flex-col w-full h-full overflow-hidden transition-all duration-300 sm:p-4 md:p-6 mx-auto ease-out",
        maximized ? "max-w-full" : "max-w-4xl",
      )}
    >
      <div className="absolute opacity-0 pointer-events-none z-[-999] h-max w-full">
        <div className="bg-background p-6" ref={container}>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="space-y-2">
                <div className="flex items-center">
                  <Newspaper className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground mr-2">
                    {t("message.sharing.title")}:
                  </span>
                  <span className="text-sm font-semibold">
                    {mobile ? extractMessage(data.name, 10) : data.name}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground mr-2">
                    {t("message.sharing.time")}:
                  </span>
                  <span className="text-sm">{time}</span>
                </div>
                <div className="flex items-center">
                  <MessagesSquare className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground mr-2">
                    {t("message.sharing.message")}:
                  </span>
                  <span className="text-sm">{data.messages.length}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <img className="w-12 h-12 mb-2" src={appLogo} alt="" />
                <div className="flex items-center">
                  <Avatar username={data.username} className="w-8 h-8 mr-2" />
                  <span className="text-sm font-semibold">{data.username}</span>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {data.messages.map((message, i) => (
                <MessageSegment
                  message={message}
                  key={i}
                  index={i}
                  username={data.username}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-5 flex flex-col w-full h-full bg-background border sm:rounded-md md:rounded-lg">
        <header className="flex items-center flex-col p-4 pb-2 border-b bg-muted/25">
          <div className="flex items-center flex-row w-full h-fit">
            <img src={appLogo} alt="" className="w-8 h-8 shrink-0 mr-2" />
            <span className="font-semibold text-lg">{appName}</span>
            <div className="flex-grow" />
            <Button
              className="flex flex-row items-center"
              variant="outline"
              onClick={() => router.navigate("/")}
            >
              <ArrowUp className="w-4 h-4 mr-1.5" />
              {t("home")}
            </Button>
          </div>

          <div className="flex flex-row items-center w-full mt-3 px-1">
            <span className="text-sm font-semibold select-none mr-1.5 shrink-0">
              @{data.username}
            </span>
            <span className="text-sm text-secondary truncate flex-grow items-center">
              {data.name}
            </span>
            <span className="text-sm text-muted-foreground flex flex-row items-center shrink-0">
              <RssIcon className="w-4 h-4 mr-0.5" /> {time}
            </span>
          </div>
        </header>
        <ScrollArea className="flex-grow">
          <div className="p-4 md:p-6 space-y-4">
            {data.messages.map((message, i) => (
              <MessageSegment
                message={message}
                key={i}
                index={i}
                username={data.username}
              />
            ))}
          </div>
        </ScrollArea>
        <footer className="flex items-center justify-between p-4 border-t border-border bg-muted/25">
          <div className="flex space-x-2 ml-auto md:ml-0">
            <Button variant="outline" onClick={saveImage}>
              <Image className="h-4 w-4 mr-2" />
              {t("message.save-image")}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const message: Message[] = data?.messages || [];
                await Promise.all([
                  new Promise<void>((resolve) => {
                    setMask({
                      avatar: "",
                      name: data.name,
                      context: message,
                    });
                    resolve();
                  }),
                  new Promise<void>((resolve) => {
                    setModel(data?.model);
                    resolve();
                  })
                ]);
                console.debug(
                  `[sharing] switch to conversation (name: ${data.name}, model: ${data.model})`,
                );
                router.navigate("/", { replace: true });
              }}
            >
              <MessagesSquare className="h-4 w-4 mr-2" />
              {t("message.use")}
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMaximized(!maximized)}
            className="ml-2 hidden md:flex"
          >
            {maximized ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Sharing() {
  const { t } = useTranslation();
  const { hash } = useParams();
  const [setup, setSetup] = useState(false);
  const [data, setData] = useState<ViewForm | null>(null);

  const loading = data === null;

  useEffectAsync(async () => {
    if (!hash || setup) return;

    setSetup(true);

    const resp = await viewConversation(hash as string);
    setData(resp);
    if (!resp.status) console.debug(`[sharing] error: ${resp.message}`);
  }, []);

  return (
    <div
      className={cn(
        "w-full h-full bg-gradient-to-br from-background to-muted/50 overflow-hidden",
        loading && "flex flex-row items-center justify-center",
      )}
    >
      {loading ? (
        <div className={`animate-spin select-none`}>
          <Loader2 className={`loader w-12 h-12`} />
        </div>
      ) : data.status ? (
        <SharingForm refer={hash} data={data.data} />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-center select-none">
          <div className="flex flex-col items-center px-2">
            <Emoji
              emoji="1f47b"
              className="w-16 h-16 md:w-20 md:h-20 mb-2.5 md:mb-4 p-2 shadow bg-muted/10 rounded-md"
            />
            <p className="text-2xl font-bold mb-3 text-foreground">
              {t("share.not-found")}
            </p>
            <p className="text-base text-muted-foreground">
              {t("share.not-found-description")}
            </p>
            <Button
              className="mt-4 flex flex-row items-center"
              onClick={() => router.navigate("/")}
            >
              <Undo2 className="w-4 h-4 mr-2" />
              {t("home")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sharing;
