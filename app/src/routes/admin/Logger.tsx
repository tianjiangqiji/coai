import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useEffectAsync } from "@/utils/hook.ts";
import {
  Logger,
  listLoggers,
  downloadLogger,
  deleteLogger,
  getLoggerConsole,
} from "@/admin/api/logger.ts";
import { getSizeUnit } from "@/utils/base.ts";
import { Download, RotateCcw, Terminal, Trash } from "lucide-react";
import { withNotify } from "@/api/common.ts";
import Paragraph from "@/components/Paragraph.tsx";
import { Label } from "@/components/ui/label.tsx";
import { NumberInput } from "@/components/ui/number-input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/components/ui/lib/utils.ts";

type LoggerItemProps = Logger & {
  onUpdate: () => void;
};
function LoggerItem({ path, size, onUpdate }: LoggerItemProps) {
  const { t } = useTranslation();
  const loggerSize = useMemo(() => getSizeUnit(size), [size]);

  return (
    <div className="flex items-center justify-between p-3 w-full max-w-full bg-background rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 mb-2">
      <div className="mr-4">
        <div className="text-sm font-medium text-foreground break-all whitespace-pre-wrap">
          {path}
        </div>
        <div className="text-xs text-muted-foreground">{loggerSize}</div>
      </div>
      <div className="grow" />
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => downloadLogger(path)}
          title={t("admin.logger.download")}
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            const resp = await deleteLogger(path);
            if (resp) onUpdate();
            withNotify(t, resp, true);
          }}
          title={t("admin.logger.delete")}
        >
          <Trash className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function LoggerList() {
  const [data, setData] = useState<Logger[]>([]);

  const sync = async () => setData(await listLoggers());

  useEffectAsync(async () => {
    await sync();
  }, []);

  return (
    <div className={`logger-list`}>
      {data.map((logger, i) => (
        <LoggerItem {...logger} key={i} onUpdate={sync} />
      ))}
    </div>
  );
}

function LoggerConsole() {
  const { t } = useTranslation();
  const [data, setData] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [length, setLength] = useState<number>(100);

  const sync = async () => {
    if (loading) return;
    setLoading(true);
    setData(await getLoggerConsole(length));
    setLoading(false);
  };
  useEffectAsync(sync, []);

  return (
    <Paragraph
      title={t("admin.logger.console")}
      className={`logger-container mb-2`}
      isCollapsed={true}
    >
      <div className={`logger-toolbar`}>
        <Label>{t("admin.logger.consoleLength")}</Label>
        <NumberInput
          value={length}
          onValueChange={setLength}
          min={1}
          max={1000}
        />
        <div className={`grow`} />
        <Button onClick={sync} variant={`outline`} size={`icon`}>
          <RotateCcw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>
      <div className={`logger-console bg-muted/20`}>
        <Terminal
          className={`w-6 h-6 p-1 bg-primary/80 hover:bg-primary/100 transition duration-300 backdrop-blur-sm text-primary-foreground rounded-sm absolute top-4 right-4`}
        />
        <pre
          className={`no-scrollbar`}
          style={{
            fontFamily: "var(--font-family-code) !important",
          }}
        >
          {data.split("\n").map((line, index) => {
            const logLevelMatch = line.match(
              /^\[(DEBUG|INFO|WARN|ERROR|CRITICAL)\]/,
            );
            const dateMatch = line.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
            const numberMatch = line.match(/\b\d+(\.\d+)?\b/g);

            let processedLine = line;

            if (logLevelMatch) {
              const logLevel = logLevelMatch[1];
              const colorClass =
                {
                  DEBUG: "text-gray-500",
                  INFO: "text-blue-500",
                  WARN: "text-yellow-500",
                  ERROR: "text-red-500",
                  CRITICAL: "text-purple-700 font-bold",
                }[logLevel] || "";

              processedLine = processedLine.replace(logLevelMatch[0], "");

              return (
                <span key={index}>
                  <span className={colorClass}>[{logLevel}]</span>
                  {dateMatch && (
                    <span className="font-thin"> {dateMatch[0]}</span>
                  )}
                  {processedLine
                    .split(/((?:\b\d+(?:\.\d+)?\b))/)
                    .map((part, i) =>
                      numberMatch && numberMatch.includes(part) ? (
                        <span key={i} className="font-semibold">
                          {part}
                        </span>
                      ) : (
                        <span key={i}>{part}</span>
                      ),
                    )}
                  {"\n"}
                </span>
              );
            }

            return (
              <span key={index}>
                {processedLine
                  .split(/((?:\b\d+(?:\.\d+)?\b))/)
                  .map((part, i) =>
                    numberMatch && numberMatch.includes(part) ? (
                      <span key={i} className="font-semibold">
                        {part}
                      </span>
                    ) : (
                      <span key={i}>{part}</span>
                    ),
                  )}
                {"\n"}
              </span>
            );
          })}
        </pre>
      </div>
    </Paragraph>
  );
}

function Logger() {
  const { t } = useTranslation();
  return (
    <div className={`logger`}>
      <Card className={`admin-card logger-card`}>
        <CardHeader className={`select-none`}>
          <CardTitle>{t("admin.logger.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LoggerConsole />
          <LoggerList />
        </CardContent>
      </Card>
    </div>
  );
}

export default Logger;
