import { useSelector } from "react-redux";
import { infoContactSelector } from "@/store/info.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import Markdown from "@/components/Markdown.tsx";
import { useTranslation } from "react-i18next";
import { TwitchIcon } from "lucide-react";

function Contact() {
  const { t } = useTranslation();
  const contact = useSelector(infoContactSelector);
  const showTrigger = contact && contact.length > 0;

  if (!showTrigger) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <p
          className={`text-sm text-primary font-medium cursor-pointer flex flex-row items-center mx-auto w-fit h-fit mt-0.5 mb-2.5 px-2.5 py-1 rounded-full border`}
        >
          <TwitchIcon className={`w-3.5 h-3.5 mr-1`} />
          {t("contact.community")}
        </p>
      </DialogTrigger>
      <DialogContent className={`flex-dialog`}>
        <DialogHeader>
          <DialogTitle>{t("contact.community")}</DialogTitle>
          <DialogDescription asChild>
            <Markdown className={`pt-4`} acceptHtml={true}>
              {contact}
            </Markdown>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default Contact;
