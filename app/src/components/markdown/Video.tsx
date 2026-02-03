import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { getFilenameFromURL } from "@/utils/base.ts";
import { AlertCircle, Copy, Eye, Link, Loader2 } from "lucide-react";
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
import { RootState } from "@/store/index.ts";

export enum VideoState {
  Loading = "loading",
  Loaded = "loaded",
  Error = "error",
}
export type VideoStateType = (typeof VideoState)[keyof typeof VideoState];

type VideoProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  alt?: string;
};

export default function Video({
  src,
  alt,
  className,
  ...props
}: VideoProps) {
  const { t } = useTranslation();
  const copy = useClipboard();
  const token = useSelector((state: RootState) => state.auth.token);

  const filename = getFilenameFromURL(src) || "unknown";
  const description = alt || filename;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<VideoStateType>(VideoState.Loading);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!src) {
      setState(VideoState.Error);
      return;
    }

    const fetchVideo = async () => {
      try {
        setState(VideoState.Loading);
        const headers: HeadersInit = {
          "Content-Type": "video/mp4",
        };

        if (token) {
          headers["Authorization"] = token;
        }

        const response = await fetch(src, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
        }

        blobUrlRef.current = blobUrl;
        setVideoUrl(blobUrl);
        setState(VideoState.Loaded);
      } catch (error) {
        console.error("[Video] Failed to load video:", error);
        setState(VideoState.Error);
      }
    };

    fetchVideo();

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src, token]);

  const isLoading = state === VideoState.Loading;
  const isError = state === VideoState.Error;
  const isLoaded = state === VideoState.Loaded;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={`flex flex-col items-center cursor-pointer`}>
          {isLoading && (
            <Skeleton
              className={`relative rounded-md w-80 h-44 mx-auto my-1 flex items-center justify-center`}
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
                {t("renderer.videoLoadFailed", { src: filename })}
              </span>
            </div>
          )}

          {videoUrl && (
            <video
              className={cn(
                className,
                "select-none outline-none rounded-md max-w-[20rem] max-h-[20rem]",
                !isLoaded && `hidden`,
              )}
              src={videoUrl}
              ref={videoRef}
              controls
              preload="metadata"
              onAbort={() => setState(VideoState.Error)}
              onError={() => setState(VideoState.Error)}
              {...props}
            />
          )}
          <span
            className={`text-secondary text-sm mt-1 select-none max-w-[20rem] text-center truncate`}
          >
            {description}
          </span>
        </div>
      </DialogTrigger>
      <DialogContent className={`flex-dialog`} couldFullScreen>
        <DialogHeader>
          <DialogTitle className={`flex flex-row items-center`}>
            <Eye className={`h-4 w-4 mr-1.5 translate-y-[1px]`} />
            {t("renderer.viewVideo")}
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
          {videoUrl && (
            <video
              className={cn(className, "rounded-md select-none outline-none max-w-full max-h-[80vh]")}
              src={videoUrl}
              controls
              preload="auto"
              {...props}
            />
          )}
          <span
            className={`text-secondary text-sm mt-2.5 text-center break-all whitespace-pre-wrap`}
          >
            <button
              onClick={() => copy(src || "")}
              className={`h-4 w-4 inline-block mr-1 outline-none translate-y-[2px]`}
            >
              <Copy className={`h-3.5 w-3.5`} />
            </button>
            {src || ''}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
