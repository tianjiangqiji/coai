import { useState } from "react";
import { ChevronDown, ChevronUp, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/lib/utils";
import Markdown from "@/components/Markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface ThinkContentProps {
  content: string;
  isComplete?: boolean;
}

export function ThinkContent({ content, isComplete = true }: ThinkContentProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { t } = useTranslation();

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="think-content-wrapper my-2 rounded-lg border bg-muted/40 dark:bg-muted/20">
      <Button
        variant="ghost"
        onClick={toggleExpand}
        className="w-full flex items-center justify-between p-2 hover:bg-muted/60"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span className="text-sm font-medium">{t("message.thinking-process")}</span>
          {!isComplete && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>
      
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            key="think-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-auto"
          >
            <div className={cn("p-3 pt-0 text-sm", !isComplete && "opacity-80")}>
              <Markdown>{content}</Markdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
