import { motion } from "framer-motion";
import {
  Loader2,
  ImageIcon,
  Maximize2,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  LayoutGrid,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import { useTranslation } from "react-i18next";

export type DrawingMainState = {
  status: "idle" | "running" | "success" | "error";
  images: string[];
  message: string;
  error?: string;
  modelName?: string;
  className?: string;
};

export default function DrawingMain({
  status,
  images,
  message,
  error,
  modelName,
  className,
}: DrawingMainState) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [resetKey, setResetKey] = useState(0);

  const handleReset = () => {
    setScale(1);
    setResetKey((prev) => prev + 1);
  };

  const isEmpty = status === "idle" && images.length === 0 && !message.length;
  const isSuccess = status === "success" && (images.length > 0 || message);

  const handleDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `drawing-${Date.now()}.png`;
    a.click();
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setScale(1);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setScale(1);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      setScale((s) => Math.min(s + 0.1, 5));
    } else {
      setScale((s) => Math.max(s - 0.1, 0.5));
    }
  };

  return (
    <motion.div
      className={cn(
        "drawing-main flex-1 flex flex-col h-full bg-background relative overflow-hidden w-full items-center",
        className,
      )}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div
        className={cn(
          "drawing-main-board flex-1 overflow-hidden p-4 md:p-6 flex flex-col items-center justify-center w-full max-w-7xl min-h-0 mx-auto",
        )}
      >
        {status === "running" && (
          <div className="drawing-progress-card flex flex-col items-center gap-4 p-8 rounded-2xl border bg-card/50 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-lg font-medium">{t("drawing.generatingHint")}</p>
          </div>
        )}

        {status === "error" && (
          <div className="drawing-error-card flex flex-col items-center gap-4 p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-destructive">
            <ImageIcon className="w-10 h-10 opacity-50" />
            <div className="text-center">
              <p className="drawing-error-title text-lg font-semibold">
                {t("drawing.errorMessage")}
              </p>
              {error && (
                <p className="drawing-error-desc text-sm opacity-80 mt-1">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center gap-4 md:gap-6 overflow-hidden">
            {images.length > 0 && (
              <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-4 overflow-hidden">
                {/* 主图展示区 */}
                <div className="relative group w-full flex-1 min-h-0 rounded-2xl overflow-hidden bg-muted/50 border shadow-2xl flex items-center justify-center">
                  <img
                    src={images[currentIndex]}
                    alt={`result-${currentIndex + 1}`}
                    className="max-w-full max-h-full w-auto h-auto object-contain cursor-zoom-in"
                    onClick={() => {
                      setViewerOpen(true);
                      setScale(1);
                    }}
                  />

                  {images.length > 1 && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 pointer-events-none z-[10]">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 bg-background/40 backdrop-blur-md hover:bg-background/60 transition-all rounded-full pointer-events-auto"
                        onClick={handlePrev}
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 bg-background/40 backdrop-blur-md hover:bg-background/60 transition-all rounded-full pointer-events-auto"
                        onClick={handleNext}
                      >
                        <ChevronRight className="w-6 h-6" />
                      </Button>
                    </div>
                  )}

                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-background/40 backdrop-blur-md hover:bg-background/60 border-none rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(images[currentIndex]);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-background/40 backdrop-blur-md hover:bg-background/60 border-none rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewerOpen(true);
                      }}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-medium">
                    {currentIndex + 1} / {images.length}
                  </div>
                </div>

                {/* 缩略图选择栏 */}
                {images.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-2 p-1.5 bg-secondary/10 rounded-xl max-w-full overflow-x-auto shrink-0">
                    {images.map((url, index) => (
                      <button
                        key={url}
                        className={cn(
                          "w-10 h-10 md:w-14 md:h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0",
                          index === currentIndex
                            ? "border-primary scale-105"
                            : "border-transparent opacity-50 hover:opacity-100",
                        )}
                        onClick={() => setCurrentIndex(index)}
                      >
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {message && (
              <div className="drawing-result-text w-full max-w-4xl p-4 md:p-5 rounded-2xl border bg-card/30 shrink-0 max-h-[120px] overflow-y-auto">
                <p className="drawing-result-label text-[10px] font-semibold text-primary mb-1 flex items-center gap-2 uppercase tracking-wider">
                  <LayoutGrid className="w-3 h-3" />
                  {t("drawing.resultLabel", {
                    name: modelName ?? "Assistant",
                  })}
                </p>
                <p className="drawing-result-message text-xs leading-relaxed whitespace-pre-wrap opacity-90">
                  {message}
                </p>
              </div>
            )}
          </div>
        )}

        {isEmpty && (
          <div className="drawing-main-placeholder flex flex-col items-center text-center max-w-md gap-4">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-2">
              <ImageIcon className="w-10 h-10 text-primary opacity-50" />
            </div>
            <h2 className="text-2xl font-bold">{t("drawing.mainTitle")}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {t("drawing.mainDesc")}
            </p>
          </div>
        )}
      </div>

      {/* 图片全屏查看器 */}
      {viewerOpen && (
        <motion.div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center touch-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onWheel={handleWheel}
        >
          {/* 顶部控制栏 - 确保在最上层 */}
          <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-[120] bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-white text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-full w-10 h-10 transition-colors"
              onClick={() => setViewerOpen(false)}
            >
              <X className="w-8 h-8" />
            </Button>
          </div>

          <div className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing">
            <motion.img
              src={images[currentIndex]}
              alt=""
              className="max-w-full max-h-full object-contain pointer-events-auto select-none"
              style={{ scale }}
              drag
              dragConstraints={{
                left: -2000,
                right: 2000,
                top: -2000,
                bottom: 2000,
              }}
              dragElastic={0.2}
              dragMomentum={false}
              dragTransition={{ power: 0, timeConstant: 0 }}
              key={`${currentIndex}-${resetKey}`} // 切换图片或点击复原时重置位置
            />

            {/* 左右切换按钮 - 始终固定在两侧，不受图片拖拽影响 */}
            {images.length > 1 && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none z-[130]">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/50 hover:text-white hover:bg-white/10 rounded-full w-14 h-14 pointer-events-auto transition-all hidden md:flex"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="w-10 h-10" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/50 hover:text-white hover:bg-white/10 rounded-full w-14 h-14 pointer-events-auto transition-all hidden md:flex"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-10 h-10" />
                </Button>
              </div>
            )}

            {/* 底部悬浮控制栏 */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-4 p-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 z-[120] shadow-2xl">
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
                onClick={() => setScale((s) => Math.max(s - 0.5, 0.5))}
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                className="text-white/80 hover:text-white hover:bg-white/10 px-4 h-10 rounded-full text-xs font-medium transition-all"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                复原
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
                onClick={() => setScale((s) => Math.min(s + 0.5, 5))}
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <div className="w-px h-6 bg-white/10 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
                onClick={() => handleDownload(images[currentIndex])}
              >
                <Download className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
