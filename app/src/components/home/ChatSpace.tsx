import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { selectAuthenticated } from "@/store/auth.ts";
import { infoAuthFooterSelector, infoFooterSelector } from "@/store/info.ts";
import Markdown from "@/components/Markdown.tsx";
import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowRight, Megaphone } from "lucide-react";
import Clickable from "@/components/ui/clickable";
import Announcement from "@/components/app/Announcement";

function Footer() {
  const auth = useSelector(selectAuthenticated);
  const footer = useSelector(infoFooterSelector);
  const authfooter = useSelector(infoAuthFooterSelector);

  if (auth && authfooter) {
    // hide footer
    return null;
  }

  return (
    footer.length > 0 && (
      <Markdown
        className={`whitespace-pre-wrap text-secondary text-xs md:text-sm rounded-md bg-background/10 backdrop-blur-sm`}
        acceptHtml={true}
      >
        {footer}
      </Markdown>
    )
  );
}

function ChatSpace() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className={`chat-product`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="flex flex-col space-y-1 w-full md:max-w-2xl mb-4 md:mx-auto px-6 select-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.div
          className="flex flex-row items-center px-1 w-full"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Megaphone className="w-3 h-3 text-secondary mr-1" />
          <p className="text-xs font-medium text-secondary mr-auto">
            {t("new-announcement")}
          </p>
          <Clickable
            tapScale={0.9}
            className="flex items-center"
            onClick={() => setOpen(true)}
          >
            <motion.button
              className="w-fit h-fit"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowRight className="w-3 h-3 text-secondary" />
            </motion.button>
            <p className="text-xs font-medium text-secondary ml-1">
              {t("learn-more")}
            </p>
          </Clickable>
        </motion.div>
        <Announcement open={open} setOpen={setOpen} />
      </motion.div>

      <motion.div
        className={`space-footer`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <Footer />
      </motion.div>
    </motion.div>
  );
}

export default ChatSpace;
