import { 
  CheckCircle, 
  XCircle, 
  Loader2,
  Copy,
  Bug,
  BugOff,
  Edit,
  Check
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MCPResultDebug } from "./MCPResultDebug";
import { useClipboard } from "@/utils/dom";

interface ToolArgumentEditorProps {
  paramKey: string;
  paramValue: unknown;
  onValueChange: (key: string, value: unknown) => void;
}

function ToolArgumentEditor({ 
  paramKey, 
  paramValue, 
  onValueChange 
}: ToolArgumentEditorProps): JSX.Element {
  const { t } = useTranslation();
  const copy = useClipboard();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(paramValue || ''));

  const handleSave = () => {
    try {
      const parsedValue = editValue.startsWith('{') || editValue.startsWith('[') 
        ? JSON.parse(editValue) 
        : editValue;
      onValueChange(paramKey, parsedValue);
    } catch {
      onValueChange(paramKey, editValue);
    }
    setIsEditing(false);
  };

  const handleCopy = async () => {
    await copy(String(paramValue));
  };

  const displayValue = typeof paramValue === 'object' 
    ? JSON.stringify(paramValue, null, 2) 
    : String(paramValue);

  return (
    <div className="tool-param-item flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{paramKey}:</span>
        {isEditing ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 text-xs bg-background border rounded px-2 py-1 min-h-[24px] font-mono resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditing(false);
              } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSave();
              }
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <pre className="flex-1 text-xs text-foreground whitespace-pre-wrap font-mono bg-muted/30 rounded px-2 py-1 min-h-[24px] leading-relaxed break-words min-w-0">
              {displayValue}
            </pre>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 self-center">
        <button
          onClick={handleCopy}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title={t("plugin.mcp.copy-param-value")}
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          onClick={() => {
            if (isEditing) {
              handleSave();
            } else {
              setEditValue(displayValue);
              setIsEditing(true);
            }
          }}
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title={isEditing ? t("plugin.mcp.save") : t("plugin.mcp.edit")}
        >
          {isEditing ? <Check className="h-3 w-3" /> : <Edit className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

interface SingleToolCallPanelProps {
  toolCall: {
    index: number;
    type: string;
    id: string;
    function: {
      name: string;
      arguments: string;
    };
    status?: "start" | "executing" | "success" | "error";
    result?: string;
    error?: string;
  };
  pluginName?: string;
}

export function SingleToolCallPanel({ 
  toolCall, 
  pluginName = "MCP" 
}: SingleToolCallPanelProps): JSX.Element {
  const { t } = useTranslation();
  const [showDebug, setShowDebug] = useState(false);
  
  const getStatusIcon = () => {
    switch (toolCall.status) {
      case "start":
      case "executing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusDescription = () => {
    switch (toolCall.status) {
      case "start":
        return t("plugin.mcp.status-prepare");
      case "executing":
        return t("plugin.mcp.status-executing");
      case "success":
        return t("plugin.mcp.status-success");
      case "error":
        return t("plugin.mcp.status-error");
      default:
        return t("plugin.mcp.status-success");
    }
  };

  const argumentsObj = (() => {
    try {
      return JSON.parse(toolCall.function.arguments);
    } catch {
      return { value: toolCall.function.arguments };
    }
  })();

  return (
    <div className="single-tool-call border rounded-md mb-3 bg-muted/20">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{pluginName} / {toolCall.function.name}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {getStatusIcon()}
              {getStatusDescription()}
            </span>
          </div>
        </div>
        
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 border rounded transition-colors flex items-center gap-1"
          title={showDebug ? t("plugin.mcp.hide-debug") : t("plugin.mcp.show-debug")}
        >
          {showDebug ? <BugOff className="h-3 w-3" /> : <Bug className="h-3 w-3" />}
          DEBUG
        </button>
      </div>

      <div className="px-3 py-3">
        <div className="text-sm font-medium text-muted-foreground mb-2">{t("plugin.mcp.tool-arguments")}</div>
        {Object.keys(argumentsObj).length > 0 ? (
          <div className="border rounded-md bg-muted/30 divide-y divide-border/50">
            {Object.entries(argumentsObj).map(([key, value]) => (
              <ToolArgumentEditor
                key={key}
                paramKey={key}
                paramValue={value}
                onValueChange={() => {}}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3">
            {t("plugin.mcp.no-arguments-needed")}
          </div>
        )}
      </div>

      {showDebug && (
        <MCPResultDebug toolCall={toolCall} />
      )}
    </div>
  );
}
