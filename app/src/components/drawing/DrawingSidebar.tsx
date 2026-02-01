import { useEffect, useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { motion } from "framer-motion";
import { selectSupportModels } from "@/store/chat.ts";
import { selectMenu } from "@/store/menu.ts";
import { cn } from "@/components/ui/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import ModelAvatar from "@/components/ModelAvatar.tsx";
import Icon from "@/components/utils/Icon";
import Tips from "@/components/Tips";
import type { DrawingHistoryItem } from "@/utils/drawing-db.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogCancel,
} from "@/components/ui/dialog.tsx";
import {
  Award,
  Bolt,
  Cpu,
  Gem,
  DollarSign,
  Eye,
  Globe,
  History,
  Image as ImageIcon,
  Github,
  Snail,
  Sparkles,
  Zap,
  Loader2,
  AlertCircle,
  X,
  Plus,
} from "lucide-react";
import { includingModelFromPlan } from "@/conf/subscription.tsx";
import { levelSelector } from "@/store/subscription.ts";
import { subscriptionDataSelector } from "@/store/globals.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import type { Model } from "@/api/types.tsx";
import { toast } from "sonner";

const DRAWING_TAG = "image-generation";
const PLAN_INCLUDED_TAG = "plan-included";
const HIDDEN_TAGS = ["official", "fast", "unstable", "free"];
const FIRST_CLASS_MODELS = new Set([
  "gpt-image-1-vip",
  "sora_image",
]);
export const RATIO_OPTIONS = [
  { label: "方形 (1:1; 1024x1024)", value: "1024x1024" },
  { label: "横屏 (16:9; 1536x1024)", value: "1536x1024" },
  { label: "竖屏 (9:16; 1024x1536)", value: "1024x1536" },
] as const;
const QUANTITY_OPTIONS = ["1", "2"];

export type DrawingSubmitPayload = {
  modelId: string;
  size: (typeof RATIO_OPTIONS)[number]["value"];
  n: number;
  prompt: string;
  image?: string; // base64
};

type DrawingSidebarProps = {
  onSubmit?: (payload: DrawingSubmitPayload) => void;
  submitting?: boolean;
  onModelChange?: (modelId: string, model: Model | null) => void;
  history?: DrawingHistoryItem[];
  onApplyHistory?: (item: DrawingHistoryItem) => void;
  onDeleteHistory?: (id: string) => void;
  onClearHistory?: () => void;
  className?: string;
  onMobileTabChange?: (tab: "prepare" | "generate") => void;
};

const TAG_ICON_MAP: Record<string, ReactNode> = {
  official: <Award />,
  "multi-modal": <Eye />,
  web: <Globe />,
  "high-quality": <Sparkles />,
  "high-price": <DollarSign />,
  "open-source": <Github />,
  fast: <Bolt />,
  unstable: <Snail />,
  "high-context": <Cpu />,
  free: <Zap />,
  [PLAN_INCLUDED_TAG]: <Gem />,
  [DRAWING_TAG]: <ImageIcon />,
};

const TAG_STYLE_MAP: Record<string, string> = {
  official: "text-amber-600 bg-amber-500/20",
  "multi-modal": "text-blue-600 bg-blue-500/20",
  web: "text-green-600 bg-green-500/20",
  "high-quality": "text-purple-600 bg-purple-500/20",
  "high-price": "text-red-600 bg-red-500/20",
  "open-source": "text-gray-600 bg-gray-500/20",
  "image-generation": "text-indigo-600 bg-indigo-500/20",
  fast: "text-yellow-600 bg-yellow-500/20",
  unstable: "text-orange-600 bg-orange-500/20",
  "high-context": "text-teal-600 bg-teal-500/20",
  free: "text-emerald-600 bg-emerald-500/20",
  [PLAN_INCLUDED_TAG]: "text-amber-600 bg-amber-500/20",
};

export default function DrawingSidebar({
  onSubmit,
  submitting,
  onModelChange,
  history = [],
  onApplyHistory,
  onDeleteHistory,
  onClearHistory,
}: DrawingSidebarProps) {
  const { t } = useTranslation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const open = useSelector(selectMenu);
  const supportModels = useSelector(selectSupportModels);
  const subscriptionData = useSelector(subscriptionDataSelector);
  const level = useSelector(levelSelector);
  const drawingModels = useMemo(
    () =>
      supportModels.filter((model) =>
        (model.tag ?? []).includes(DRAWING_TAG),
      ),
    [supportModels],
  );

  const [selectedId, setSelectedId] = useState<string>(
    drawingModels[0]?.id ?? "",
  );
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [ratio, setRatio] = useState<(typeof RATIO_OPTIONS)[number]["value"]>(
    RATIO_OPTIONS[0].value,
  );
  const [quantity, setQuantity] = useState<string>(QUANTITY_OPTIONS[0]);
  const [prompt, setPrompt] = useState<string>("");
  const [image, setImage] = useState<string>("");

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(t("drawing.invalidFileType") || "请上传图片文件");
      return;
    }

    if (file.size > 1024 * 1024 * 4) {
      toast.error(t("drawing.imageTooLarge") || "图片大小不能超过 4MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImage(base64);
      setMode("edit"); // 自动切换到编辑模式
    };
    reader.readAsDataURL(file);
  }, [t]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) processFile(file);
      }
    }
  }, [processFile]);

  const [isDragging, setIsDragging] = useState(false);
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const isDalleModel = useMemo(() => {
    return selectedId === "gpt-image-1-vip" || selectedId === "sora_image";
  }, [selectedId]);

  useEffect(() => {
    if (drawingModels.length === 0) {
      setSelectedId("");
      return;
    }

    if (!selectedId || !drawingModels.some((model) => model.id === selectedId)) {
      setSelectedId(drawingModels[0].id);
    }
  }, [drawingModels, selectedId]);

  const selectedModel =
    drawingModels.find((model) => model.id === selectedId) ?? null;
  const isSupportedModel = FIRST_CLASS_MODELS.has(selectedModel?.id ?? "");

  const isPlanIncluded = useMemo(
    () => (modelId: string) =>
      subscriptionData
        ? includingModelFromPlan(subscriptionData, level, modelId)
        : false,
    [subscriptionData, level],
  );

  useEffect(() => {
    setRatio(RATIO_OPTIONS[0].value);
    setQuantity(QUANTITY_OPTIONS[0]);
    setPrompt("");
  }, [selectedId]);

  useEffect(() => {
    onModelChange?.(selectedModel?.id ?? "", selectedModel);
  }, [selectedModel, onModelChange]);

  const handleSubmit = () => {
    if (!selectedModel || !isSupportedModel) return;
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      toast.info(t("drawing.promptRequired"));
      return;
    }

    onSubmit?.({
      modelId: selectedId,
      size: ratio,
      n: parseInt(quantity, 10),
      prompt: cleanPrompt,
      image: mode === "edit" ? image : undefined,
    });
  };

  const getTagIcons = (modelId: string, tags: string[] = []) => {
    const mergedTags = [...(tags ?? [])];
    const planIncluded = isPlanIncluded(modelId);

    if (planIncluded && !mergedTags.includes(PLAN_INCLUDED_TAG)) {
      mergedTags.unshift(PLAN_INCLUDED_TAG);
    }

    return mergedTags
      .filter(
        (tag) =>
          TAG_ICON_MAP[tag] &&
          (tag === PLAN_INCLUDED_TAG || !HIDDEN_TAGS.includes(tag)),
      )
      .map((tag) => (
        <Tips
          key={`${modelId}-${tag}`}
          content={
            tag === PLAN_INCLUDED_TAG
              ? t("tag.badges.plan-included-tip")
              : t(`tag.${tag}`)
          }
          trigger={
            <span
              className={cn(
                "drawing-select-tag-icon drawing-tag-trigger bg-primary/5 ml-1",
                TAG_STYLE_MAP[tag] ?? "text-muted-foreground bg-primary/5",
              )}
            >
              <Icon icon={TAG_ICON_MAP[tag]} className="w-3.5 h-3.5" />
            </span>
          }
        />
      ));
  };

  return (
    <motion.div
      className={cn("sidebar drawing-sidebar", open && "open", isDragging && "dragging-border")}
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      onPaste={onPaste}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="drawing-sidebar-top">
        <div className="drawing-sidebar-header">
          <p className="drawing-sidebar-title flex-1">
            {t("drawing.modelSelectorTitle")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="drawing-history-button"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="w-4 h-4" />
            <span>{t("drawing.historyButton")}</span>
          </Button>
        </div>

        {historyOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setHistoryOpen(false)}
          >
            <motion.div
              className="bg-card border shadow-lg rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">{t("drawing.historyButton")}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                        >
                          <X className="w-4 h-4" />
                          <span>{t("drawing.clearHistory")}</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("are-you-sure")}</DialogTitle>
                          <DialogDescription>
                            {t("drawing.clearHistoryConfirm")}
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogCancel>{t("conversation.cancel")}</DialogCancel>
                          <Button
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onClearHistory?.()}
                          >
                            {t("confirm")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setHistoryOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-amber-600 dark:text-amber-500 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{t("drawing.historyWarning")}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mb-4 opacity-20" />
                    <p>{t("drawing.modelEmptyTitle")}</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex flex-row gap-4 p-3 rounded-lg border bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => {
                        onApplyHistory?.(item);
                        setHistoryOpen(false);
                      }}
                    >
                      <div className="w-20 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {item.images.length > 0 ? (
                          <img
                            src={item.images[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <p className="text-sm font-medium truncate mb-1">
                          {item.params.prompt}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Plus className="w-3 h-3" />
                            {item.modelName}
                          </span>
                          <span>{new Date(item.time).toLocaleString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full hover:bg-destructive hover:text-white transition-all flex-shrink-0 self-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteHistory?.(item.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        <Select
          value={selectedId}
          onValueChange={setSelectedId}
          disabled={drawingModels.length === 0}
        >
          <SelectTrigger className="drawing-model-select">
            {selectedModel ? (
              <SelectValue asChild>
                <div className="drawing-select-row">
                  <ModelAvatar model={selectedModel} size={24} />
                  <span className="drawing-select-name">
                    {selectedModel.name}
                  </span>
                </div>
              </SelectValue>
            ) : (
              <SelectValue placeholder={t("drawing.modelPlaceholder")} />
            )}
          </SelectTrigger>
          <SelectContent>
            {drawingModels.map((model) => (
              <SelectItem
                key={model.id}
                value={model.id}
                className="drawing-select-option"
              >
                <div className="drawing-select-row">
                  <ModelAvatar model={model} size={24} />
                  <span className="drawing-select-name">{model.name}</span>
                  <div className="drawing-select-tags">
                    {getTagIcons(model.id, model.tag)}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {drawingModels.length === 0 && (
        <div className="drawing-empty-block">
          <p className="drawing-empty-title">{t("drawing.modelEmptyTitle")}</p>
          <p className="drawing-empty-desc">{t("drawing.modelEmptyDesc")}</p>
        </div>
      )}

      {selectedModel &&
        (isSupportedModel ? (
          <div className="drawing-config-card">
            {isDalleModel && (
              <div className="drawing-form-section">
                <div className="flex flex-row items-center justify-between p-1 bg-secondary/50 rounded-lg mb-2">
                  <button
                    className={cn(
                      "flex-1 py-1 text-xs rounded-md transition-all",
                      mode === "generate"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setMode("generate")}
                  >
                    {t("drawing.modeGenerate")}
                  </button>
                  <button
                    className={cn(
                      "flex-1 py-1 text-xs rounded-md transition-all",
                      mode === "edit"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() => setMode("edit")}
                  >
                    {t("drawing.modeEdit")}
                  </button>
                </div>
              </div>
            )}

            {mode === "edit" ? (
              <>
                <div className="drawing-form-section">
                  <Label>{t("drawing.uploadImage") || "上传图片"}</Label>
                  <div className="flex flex-col gap-3">
                    {image ? (
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden border bg-muted group">
                        <img
                          src={image}
                          alt="Upload preview"
                          className="w-full h-full object-contain"
                        />
                        <button
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground shadow-sm transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => setImage("")}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative aspect-square w-full rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors flex flex-col items-center justify-center bg-secondary/20 group cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleImageUpload}
                        />
                        <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                          <Plus className="w-8 h-8" />
                          <span className="text-xs font-medium">{t("drawing.clickToUpload") || "点击上传图片"}</span>
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground px-1 italic">
                      {t("drawing.editTip") || "* 图片编辑模式需要上传一张基础图片"}
                    </p>
                  </div>
                </div>

                <div className="drawing-form-section">
                  <Label htmlFor="drawing-ratio">{t("drawing.ratioLabel")}</Label>
                  <Select
                    value={ratio}
                    onValueChange={(value) =>
                      setRatio(value as (typeof RATIO_OPTIONS)[number]["value"])
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger
                      id="drawing-ratio"
                      className="drawing-ratio-select"
                    >
                      <SelectValue placeholder={t("drawing.ratioLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {RATIO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="drawing-form-section">
                  <Label htmlFor="drawing-prompt">
                    {t("drawing.editPromptLabel") || "修改建议"}
                  </Label>
                  <Textarea
                    id="drawing-prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={t("drawing.editPromptPlaceholder") || "描述你想要如何修改这张图片..."}
                    disabled={submitting}
                    className="min-h-[100px] resize-y"
                  />
                </div>

                <Button
                  type="button"
                  className="drawing-submit-button"
                  onClick={handleSubmit}
                  disabled={!prompt.trim().length || !image || submitting}
                >
                  {submitting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <span>
                    {submitting
                      ? t("drawing.editingButton") || "正在编辑..."
                      : t("drawing.editButton") || "开始编辑"}
                  </span>
                </Button>
              </>
            ) : (
              <>
                <div className="drawing-form-section">
                  <Label htmlFor="drawing-ratio">{t("drawing.ratioLabel")}</Label>
                  <Select
                    value={ratio}
                    onValueChange={(value) =>
                      setRatio(value as (typeof RATIO_OPTIONS)[number]["value"])
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger
                      id="drawing-ratio"
                      className="drawing-ratio-select"
                    >
                      <SelectValue placeholder={t("drawing.ratioLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {RATIO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="drawing-form-section">
                  <Label htmlFor="drawing-quantity">
                    {t("drawing.quantityLabel")}
                  </Label>
                  <Select
                    value={quantity}
                    onValueChange={setQuantity}
                    disabled={submitting}
                  >
                    <SelectTrigger
                      id="drawing-quantity"
                      className="drawing-quantity-select"
                    >
                      <SelectValue placeholder={t("drawing.quantityLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {QUANTITY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {t("drawing.quantityValue", { count: Number(option) })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="drawing-form-section">
                  <Label htmlFor="drawing-prompt">
                    {t("drawing.promptLabel")}
                  </Label>
                  <Textarea
                    id="drawing-prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={t("drawing.promptPlaceholder")}
                    disabled={submitting}
                    className="min-h-[120px] resize-y"
                  />
                </div>

                <Button
                  type="button"
                  className="drawing-submit-button"
                  onClick={handleSubmit}
                  disabled={!prompt.trim().length || submitting}
                >
                  {submitting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <span>
                    {submitting
                      ? t("drawing.generatingButton")
                      : t("drawing.generateButton")}
                  </span>
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="drawing-preview-card">
            <p className="drawing-preview-title">
              {t("drawing.previewTitle", { name: selectedModel.name })}
            </p>
            <p className="drawing-preview-desc">{t("drawing.previewDesc")}</p>
          </div>
        ))}
    </motion.div>
  );
}
