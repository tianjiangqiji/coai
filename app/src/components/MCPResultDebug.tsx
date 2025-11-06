import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";

interface MCPResultDebugProps {
  toolCall: {
    function: {
      arguments: string;
    };
    result?: string;
    error?: string;
  };
}

export function MCPResultDebug({ toolCall }: MCPResultDebugProps): JSX.Element {
  const { t } = useTranslation();

  const hasResult = !!toolCall.result;
  const hasError = !!toolCall.error;

  const defaultTab = hasResult ? "result" : hasError ? "error" : "arguments";

  const formatContent = (content: string): string => {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  };

  const formattedArguments = formatContent(toolCall.function.arguments);
  const formattedResult = toolCall.result ? formatContent(toolCall.result) : '';
  const formattedError = toolCall.error ? formatContent(toolCall.error) : '';

  const [contentHeights, setContentHeights] = useState<{
    arguments: number;
    result: number;
    error: number;
  }>({ arguments: 0, result: 0, error: 0 });

  const argumentsRef = useRef<HTMLPreElement>(null);
  const resultRef = useRef<HTMLPreElement>(null);
  const errorRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const measureHeight = () => {
      const newHeights = {
        arguments: argumentsRef.current?.scrollHeight || 0,
        result: resultRef.current?.scrollHeight || 0,
        error: errorRef.current?.scrollHeight || 0,
      };
      setContentHeights(newHeights);
    };

    const timeout = setTimeout(measureHeight, 100);
    return () => clearTimeout(timeout);
  }, [formattedArguments, formattedResult, formattedError]);

  const SCROLL_THRESHOLD = 200;

  const ContentWrapper = ({ 
    children, 
    shouldScroll, 
    className 
  }: { 
    children: React.ReactNode; 
    shouldScroll: boolean;
    className?: string;
  }) => {
    if (shouldScroll) {
      return (
        <ScrollArea className={`mcp-debug-scroll-area ${className || ''}`}>
          {children}
        </ScrollArea>
      );
    }
    return <div className={`mcp-debug-content ${className || ''}`}>{children}</div>;
  };

  return (
    <div className="px-3 pb-3">
      <div className="debug-panel mt-4 border-t pt-4">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-auto mcp-debug-tabs">
            <TabsTrigger value="arguments" className="text-xs">
              {t("plugin.mcp.raw-arguments")}
            </TabsTrigger>
            {hasResult && (
              <TabsTrigger value="result" className="text-xs">
                {t("plugin.mcp.result")}
              </TabsTrigger>
            )}
            {hasError && (
              <TabsTrigger value="error" className="text-xs">
                {t("plugin.mcp.error")}
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="arguments" className="mt-3">
            <ContentWrapper shouldScroll={contentHeights.arguments > SCROLL_THRESHOLD}>
              <pre 
                ref={argumentsRef}
                className="text-xs bg-muted/50 rounded p-3 font-mono whitespace-pre-wrap break-words min-w-0"
              >
                {formattedArguments}
              </pre>
            </ContentWrapper>
          </TabsContent>
          
          {hasResult && (
            <TabsContent value="result" className="mt-3">
              <ContentWrapper shouldScroll={contentHeights.result > SCROLL_THRESHOLD}>
                <pre 
                  ref={resultRef}
                  className="text-xs bg-green-500/10 border border-green-500/20 rounded p-3 font-mono whitespace-pre-wrap break-words min-w-0"
                >
                  {formattedResult}
                </pre>
              </ContentWrapper>
            </TabsContent>
          )}
          
          {hasError && (
            <TabsContent value="error" className="mt-3">
              <ContentWrapper shouldScroll={contentHeights.error > SCROLL_THRESHOLD}>
                <pre 
                  ref={errorRef}
                  className="text-xs bg-red-500/10 border border-red-500/20 rounded p-3 font-mono whitespace-pre-wrap break-words min-w-0"
                >
                  {formattedError}
                </pre>
              </ContentWrapper>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
