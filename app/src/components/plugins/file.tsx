import { Download, Eye, Paperclip } from "lucide-react";
import { saveAsFile, saveBlobAsFile, saveImageAsFile } from "@/utils/dom.ts";
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button.tsx";
import FileViewer from "@/components/FileViewer.tsx";

/**
 * file format:
 * ```file
 * [[<filename>]]
 * <file content>
 * ```
 */

type MarkdownFileProps = {
  children: React.ReactNode;
  acceptDownload?: boolean;
};

export function MarkdownFile({ children, acceptDownload }: MarkdownFileProps) {
  const data = children?.toString() || "";
  const filename = data.split("\n")[0].replace("[[", "").replace("]]", "");
  const content = data.replace(`[[${filename}]]\n`, "");

  // const suffix = useMemo(() => {
  //   // get file extension from filename (like: .png, .jpg, .jpeg, .gif)
  //   return filename.split(".").pop() || "";
  // }, [filename]);

  const image = useMemo(() => {
    // get image url from content (like: https://i.imgur.com/xxxxx.png)
    const match = content.match(/(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/);
    return match ? match[0] : "";
  }, [filename, content]);

  const b64image = useMemo(() => {
    // get base64 image from content (like: data:image/png;base64,xxxxx)
    const match = content.match(
      /data:image\/([^;]+);base64,([a-zA-Z0-9+/=]+)/g,
    );
    return match ? match[0] : "";
  }, [filename, content]);

  return (
    <div
      className={`file-instance`}
      onClick={(e) => {
        if (!acceptDownload) return;
        e.preventDefault();
        e.stopPropagation();

        saveAsFile(filename, content);
      }}
    >
      <div className={`file-content px-1`}>
        <Paperclip className={`mr-1 !bg-transparent`} />
        <span className={`name mr-2`}>{filename}</span>
        <div className={`grow`} />
        {image || b64image ? (
          <Button
            variant={`ghost`}
            size={`icon`}
            className={`download-action p-0 h-4 w-4`}
            onClick={async () => {
              if (b64image) {
                saveImageAsFile(filename, b64image);
                return;
              }
              const res = await fetch(image);
              saveBlobAsFile(filename, await res.blob());
            }}
          >
            <Download className={`cursor-pointer !bg-transparent`} />
          </Button>
        ) : (
          <FileViewer filename={filename} content={content} asChild>
            <div className="w-fit h-fit cursor-pointer">
              <Eye className={`!bg-transparent`} />
            </div>
          </FileViewer>
        )}
      </div>
      {image && <img src={image} className={`file-image`} alt={""} />}
      {b64image && <img src={b64image} className={`file-image`} alt={""} />}
    </div>
  );
}
