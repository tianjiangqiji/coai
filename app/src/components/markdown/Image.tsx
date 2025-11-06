import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { getFilenameFromURL } from "@/utils/base.ts";
import { AlertCircle, Copy, Eye, Link, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
  const isBase64Image = src?.startsWith('data:image');

  const imgRef = useRef<HTMLImageElement>(null);
  const [state, setState] = React.useState<ImageStateType>(ImageState.Loading);

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
      <DialogContent className={`flex-dialog`} couldFullScreen>
        <DialogHeader>
          <DialogTitle className={`flex flex-row items-center`}>
            <Eye className={`h-4 w-4 mr-1.5 translate-y-[1px]`} />
            {t("renderer.viewImage")}
          </DialogTitle>
        </DialogHeader>
        <div className={`flex flex-row mb-2 items-center`}>
          <div className={`grow`} />
          <Button
            size={`icon`}
            variant={`outline`}
            className={`ml-2`}
            onClick={() => copy(src || "")}
          >
            <Copy className={`h-4 w-4`} />
          </Button>
          <Button
            size={`icon`}
            variant={`outline`}
            className={`ml-2`}
            onClick={() => openWindow(src || "")}
            disabled={isError}
          >
            <Link className={`h-4 w-4`} />
          </Button>
        </div>
        <div className={`flex flex-col items-center`}>
          <img
            className={cn(className, "rounded-md select-none outline-none")}
            src={src}
            alt={alt}
            {...props}
          />
          <span
            className={`text-secondary text-sm mt-2.5 text-center break-all whitespace-pre-wrap`}
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
