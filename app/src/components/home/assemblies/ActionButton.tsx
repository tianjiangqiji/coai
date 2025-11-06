import { Button } from "@/components/ui/button.tsx";
import {
  CornerDownLeftIcon,
  PauseCircle,
  Send,
  ArrowUpCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import Icon from "@/components/utils/Icon.tsx";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { senderSelector } from "@/store/settings.ts";
import { useMobile } from "@/utils/device.ts";
import { motion, AnimatePresence } from "framer-motion";

type SendButtonProps = {
  working: boolean;
  onClick: () => any;
};

function ActionButton({ onClick, working }: SendButtonProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      className={`action-button`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Button
        className={`inline-flex flex-row items-center shrink-0 whitespace-nowrap`}
        onClick={onClick}
        unClickable
      >
        <div className="translate-y-[1px]">
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: working ? 360 : 0 }}
            transition={{ duration: 0.25 }}
            className="w-fit h-fit"
          >
            <Icon
              icon={working ? <PauseCircle /> : <ArrowUpCircle />}
              className={`h-4 w-4 shrink-0`}
            />
          </motion.div>
        </div>

        <motion.span
          key={working ? "stop" : "send"}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="ml-1.5"
        >
          {t(working ? "stop" : "send")}
        </motion.span>
      </Button>
    </motion.div>
  );
}

type ActionCommandProps = {
  input: string;
};

export function ActionCommand({ input }: ActionCommandProps) {
  const mobile = useMobile();
  const sender = useSelector(senderSelector);
  const display = useMemo(() => {
    return input.split("\n").length < 2 && input.length < 10;
  }, [input]);

  return (
    <AnimatePresence>
      {display && (
        <motion.div
          className={`flex flex-col text-xs text-unread select-none`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className={`flex flex-row items-center`}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Icon
              icon={sender ? <Send /> : <CornerDownLeftIcon />}
              className={`h-3 w-3 mr-1.5`}
            />
            Enter
          </motion.div>
          {!mobile && (
            <motion.div
              className={`flex flex-row items-center`}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Icon
                icon={!sender ? <Send /> : <CornerDownLeftIcon />}
                className={`h-3 w-3 mr-1.5`}
              />
              Ctrl + Enter
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ActionButton;
