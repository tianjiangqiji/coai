import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogAction,
} from "@/components/ui/dialog";
import { ArrowRight, Bell, Check, Megaphone } from "lucide-react";
import Markdown from "@/components/Markdown.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { useEffectAsync } from "@/utils/hook.ts";
import { BroadcastInfo, getBroadcastList } from "@/api/broadcast.ts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import Contact from "./Contact";
import { useSelector } from "react-redux";
import { infoAnnouncementSelector, infoBroadcastSelector } from "@/store/info";

type AnnouncementProps = {
  className?: string;
  children?: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
};

function Announcement({
  className,
  children,
  open,
  setOpen,
}: AnnouncementProps) {
  const { t } = useTranslation();

  const announcement = useSelector(infoAnnouncementSelector);
  const broadcast = useSelector(infoBroadcastSelector);

  const [dialog, setDialog] = useState<boolean>(false);

  const displayBroadcastMessage = useMemo(() => {
    const segs = broadcast.message.split("\n");

    // if > 6 lines, only show the part above
    if (segs.length > 6) {
      return segs.slice(0, 6).join("\n") + " ...";
    }

    return broadcast.message;
  }, [broadcast.message]);

  const TriggerComp = children || (
    <div
      className={cn(
        "flex items-center w-full p-4 rounded-lg border shadow-sm hover:bg-muted/50 hover:border-primary/50 transition duration-300 cursor-pointer",
        "bg-gradient-to-br from-background to-muted/50",
        className,
      )}
    >
      <Markdown acceptHtml={true} className="p-0 text-sm text-secondary">
        {displayBroadcastMessage || t("no-announcement")}
      </Markdown>
    </div>
  );

  return (
    <>
      <BroadcastList open={dialog} setOpen={setDialog} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{TriggerComp}</DialogTrigger>
        <DialogContent
          className={`announcement-dialog flex-dialog`}
          couldFullScreen
        >
          <DialogHeader notTextCentered>
            <DialogTitle className={"flex flex-row items-center select-none"}>
              <Bell className="inline-block w-4 h-4 mr-2" />
              <p className={`translate-y-[-1px]`}>{t("announcement")}</p>
            </DialogTitle>
            <DialogDescription asChild>
              <ScrollArea
                className={`w-full h-[60vh] md:h-[70vh] px-2.5 content-h-fit`}
                type={`always`}
              >
                <Contact />
                {broadcast.message.length > 0 && (
                  <Alert
                    className={`mt-1.5 mb-4 mx-0.5 w-[calc(100%-0.5rem)] pb-3.5`}
                  >
                    <Megaphone className="select-none h-5 w-5" />
                    <AlertTitle
                      className={`flex flex-row items-center select-none font-bold`}
                    >
                      {t("notify")}
                      {broadcast.firstReceived && (
                        <Badge className={`ml-1.5`}>{t("new-notify")}</Badge>
                      )}
                      <div className={`grow`} />
                      <div
                        className={`ml-0.5 font-normal select-none cursor-pointer flex flex-row items-center transition text-blue-500 opacity-95 hover:opacity-100 group`}
                        onClick={() => setDialog(true)}
                      >
                        <ArrowRight
                          className={`h-3.5 w-3.5 transition mr-1 group-hover:translate-x-0.5`}
                        />
                        {t("view-all")}
                      </div>
                    </AlertTitle>
                    <AlertDescription
                      className={`mt-2 text-common whitespace-pre-wrap broadcast-markdown`}
                    >
                      <Markdown acceptHtml={true}>{broadcast.message}</Markdown>
                    </AlertDescription>
                  </Alert>
                )}
                <Markdown acceptHtml={true}>
                  {announcement || t("empty")}
                </Markdown>
              </ScrollArea>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogAction onClick={() => setOpen(false)}>
              <Check className="w-4 h-4 mr-1" />
              {t("i-know")}
            </DialogAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type BroadcastListProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};
function BroadcastList({ open, setOpen }: BroadcastListProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<BroadcastInfo[]>([]);

  useEffectAsync(async () => {
    if (!open || data.length > 0) return;
    setData(await getBroadcastList());
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={`announcement-dialog flex-dialog`}
        couldFullScreen
      >
        <DialogHeader notTextCentered>
          <DialogTitle className={"flex flex-row items-center select-none"}>
            <Megaphone className="inline-block w-4 h-4 mr-2" />
            <p className={`translate-y-[-1px]`}>{t("notify")}</p>
          </DialogTitle>
          <DialogDescription asChild>
            <ScrollArea
              className={`w-full h-[60vh] md:h-[70vh] px-2.5 content-h-fit`}
              type={`always`}
            >
              {data.map((item, index) => (
                <Alert
                  key={index}
                  className={`mt-1.5 mb-4 mx-0.5 w-[calc(100%-0.5rem)] pb-3.5`}
                >
                  <Megaphone className="select-none h-5 w-5" />
                  <AlertTitle
                    className={`flex flex-row items-center select-none font-bold`}
                  >
                    <Badge className={`h-5 mr-2`}>#{item.index}</Badge>{" "}
                    <p className={`font-normal text-sm`}>{item.created_at}</p>
                  </AlertTitle>
                  <AlertDescription
                    className={`mt-2 text-common whitespace-pre-wrap`}
                  >
                    {item.content}
                  </AlertDescription>
                </Alert>
              ))}
            </ScrollArea>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogAction onClick={() => setOpen(false)}>
            <Check className="w-4 h-4 mr-1" />
            {t("i-know")}
          </DialogAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default Announcement;
