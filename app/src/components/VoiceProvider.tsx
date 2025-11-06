import { ChatAction } from "@/components/home/assemblies/ChatAction.tsx";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Mic } from "lucide-react";

export function VoiceAction() {
  const { t } = useTranslation();

  return (
    <ChatAction
      text={t("chat.voice")}
      onClick={() => toast.info(t("coming-soon"))}
    >
      <Mic className={"w-4 h-4"} />
    </ChatAction>
  );
}
