import React from "react";
import { Info } from "lucide-react";
import { cn } from "@/components/ui/lib/utils.ts";
import Markdown from "@/components/Markdown.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { Badge } from "@/components/ui/badge.tsx";

export type ParagraphProps = {
  isPro?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
  configParagraph?: boolean;
  isCollapsed?: boolean;
};

function Paragraph({
  title,
  children,
  className,
  configParagraph,
  isCollapsed,
  isPro,
}: ParagraphProps) {
  return (
    <Accordion type={`single`} collapsible={isCollapsed} defaultValue={"item"}>
      <AccordionItem
        value={`item`}
        className={cn(
          `paragraph`,
          configParagraph && `config-paragraph`,
          className,
        )}
      >
        <AccordionTrigger className={`paragraph-header`}>
          <div className={`paragraph-title flex flex-row items-center`}>
            {title ?? ""}
            {isPro && (
              <Badge className={`ml-2`} variant={`gold`}>
                Pro
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className={`paragraph-content mt-2`}>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function ParagraphItem({
  children,
  className,
  rowLayout,
}: {
  children: React.ReactNode;
  className?: string;
  rowLayout?: boolean;
}) {
  return (
    <div className={cn("paragraph-item", className, rowLayout && "row-layout")}>
      {children}
    </div>
  );
}

type ParagraphDescriptionProps = {
  children: string;
  border?: boolean;
  hideIcon?: boolean;
  className?: string;
  classNameMarkdown?: string;
};

export function ParagraphDescription({
  children,
  border,
  hideIcon,
  className,
  classNameMarkdown,
}: ParagraphDescriptionProps) {
  return (
    <div
      className={cn(
        "paragraph-description",
        border && `px-3 py-2 border rounded-lg`,
        className,
      )}
    >
      {!hideIcon && <Info size={16} />}
      <Markdown
        children={children}
        className={cn("leading-6", classNameMarkdown)}
      />
    </div>
  );
}

export function ParagraphSpace() {
  return <div className={`paragraph-space`} />;
}

function ParagraphFooter({ children }: { children: React.ReactNode }) {
  return <div className={`paragraph-footer`}>{children}</div>;
}

export default Paragraph;
export { ParagraphItem, ParagraphFooter };
