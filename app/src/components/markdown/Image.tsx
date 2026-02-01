import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getFilenameFromURL } from "@/utils/base.ts";
import { AlertCircle, Copy, Eye, Link, Loader2, ChevronDown, ChevronUp, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { useClipboard } from "@/utils/dom.ts";
import { Button } from "@/components/ui/button.tsx";
import { openWindow } from "@/utils/device.ts";

export enum ImageState {
  Loading = "loading",
  Loaded = "loaded",
  Error = "error",
}
export type ImageStateType = (typeof ImageState)[keyof typeof ImageState];

export default function Image({
  src,
  alt,
  className,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { t } = useTranslation();
  const copy = useClipboard();
  const [isBase64Expanded, setIsBase64Expanded] = React.useState(false);

  const filename = getFilenameFromURL(src) || "unknown";
  const description = alt || filename;
  const isBase64Image = src?.startsWith("data:image");

  const imgRef = useRef<HTMLImageElement>(null);
  const [state, setState] = React.useState<ImageStateType>(ImageState.Loading);

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.1));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1 && position.x === 0 && position.y === 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 && position.x === 0 && position.y === 0) return;
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => Math.max(0.1, Math.min(prev + delta, 5)));
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      return () => window.removeEventListener("mouseup", handleMouseUp);
    }
  }, [isDragging]);

  const isLoading = state === ImageState.Loading;
  const isError = state === ImageState.Error;
  const isLoaded = state === ImageState.Loaded;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={`flex flex-col items-center cursor-pointer`}>
          {isLoading && (
            <Skeleton
              className={`relative rounded-md w-44 h-44 mx-auto my-1 flex items-center justify-center`}
            >
              <Loader2 className={`w-6 h-6 animate-spin`} />
            </Skeleton>
          )}

          {isError && (
            <div
              className={`flex flex-col items-center text-center border rounded-md py-6 px-8 mx-auto my-1`}
            >
              <AlertCircle className={`h-5 w-5 text-secondary mb-1`} />
              <span
                className={`text-secondary mb-0 select-none text-sm whitespace-pre-wrap`}
              >
                {t("renderer.imageLoadFailed", { src: filename })}
              </span>
            </div>
          )}

          <img
            className={cn(
              className,
              "select-none outline-none",
              !isLoaded && `hidden`,
            )}
            src={src}
            ref={imgRef}
            alt={alt || t("renderer.imageLoadFailed", { src })}
            onLoad={() => setState(ImageState.Loaded)}
            onAbort={() => setState(ImageState.Error)}
            onError={() => setState(ImageState.Error)}
            {...props}
          />
          <span
            className={`text-secondary text-sm mt-1 select-none max-w-[10rem] text-center truncate`}
          >
            {description}
          </span>
        </div>
      </DialogTrigger>
      <DialogContent className={`flex-dialog max-w-[90vw] max-h-[90vh]`} couldFullScreen>
        <DialogHeader>
          <DialogTitle className={`flex flex-row items-center`}>
            <Eye className={`h-4 w-4 mr-1.5 translate-y-[1px]`} />
            {t("renderer.viewImage")}
          </DialogTitle>
        </DialogHeader>
        <div className={`flex flex-row mb-2 items-center gap-2`}>
          <div className={`flex items-center border rounded-md px-1 bg-background/50`}>
            <Button size={`icon`} variant={`ghost`} className={`h-8 w-8`} onClick={handleZoomOut} title={t("zoom-out")}>
              <ZoomOut className={`h-4 w-4`} />
            </Button>
            <div className={`text-xs px-2 min-w-[3rem] text-center select-none`}>
              {Math.round(scale * 100)}%
            </div>
            <Button size={`icon`} variant={`ghost`} className={`h-8 w-8`} onClick={handleZoomIn} title={t("zoom-in")}>
              <ZoomIn className={`h-4 w-4`} />
            </Button>
            <div className={`w-px h-4 bg-border mx-1`} />
            <Button size={`icon`} variant={`ghost`} className={`h-8 w-8`} onClick={handleReset} title={t("reset")}>
              <RotateCcw className={`h-4 w-4`} />
            </Button>
          </div>
          <div className={`grow`} />
          <Button
            size={`icon`}
            variant={`outline`}
            onClick={() => copy(src || "")}
          >
            <Copy className={`h-4 w-4`} />
          </Button>
          <Button
            size={`icon`}
            variant={`outline`}
            onClick={() => openWindow(src || "")}
            disabled={isError}
          >
            <Link className={`h-4 w-4`} />
          </Button>
        </div>
        <div className={`flex flex-col items-center overflow-hidden relative grow`}>
          <div
            ref={containerRef}
            className={cn(
              "relative flex items-center justify-center w-full h-full min-h-[400px] overflow-hidden bg-secondary/10 rounded-md",
              (scale > 1 || position.x !== 0 || position.y !== 0) && "cursor-move"
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
          >
            <img
              className={cn("max-w-full max-h-full transition-transform duration-75 ease-out select-none pointer-events-none")}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              }}
              src={src}
              alt={alt}
              {...props}
            />
          </div>
          <span
            className={`text-secondary text-sm mt-2.5 text-center break-all whitespace-pre-wrap shrink-0`}
          >
            <button
              onClick={() => copy(src || "")}
              className={`h-4 w-4 inline-block mr-1 outline-none translate-y-[2px]`}
            >
              <Copy className={`h-3.5 w-3.5`} />
            </button>
            {isBase64Image ? (
              <>
                <button
                  onClick={() => setIsBase64Expanded(!isBase64Expanded)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors duration-200"
                >
                  {isBase64Expanded ? (
                    <ChevronUp className="h-3 w-3 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="h-3 w-3 transition-transform duration-200" />
                  )}
                  {t(isBase64Expanded ? "renderer.base64ImageCollapse" : "renderer.base64Image")}
                </button>
                <div className={`mt-2 transition-all duration-200 ${isBase64Expanded ? 'opacity-100' : 'opacity-50'}`}>
                  {isBase64Expanded ? src : `${(src || '').substring(0, 50)}...`}
                </div>
              </>
            ) : (
              src || ''
            )}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
