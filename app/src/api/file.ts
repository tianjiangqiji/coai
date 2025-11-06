import { blobEndpoint } from "@/conf/env.ts";
import { trimSuffixes } from "@/utils/base.ts";

export type BlobParserResponse = {
  status: boolean;
  content: string;
  error?: string;
};

export type FileObject = {
  name: string;
  content: string;
  size?: number;
};

type Model = {
  id: string;
  ocr_model?: boolean;
  vision_model?: boolean;
  reverse_model?: boolean;
};

export type FileArray = FileObject[];

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
}

export function checkFileSuffix(
  filename: string,
  suffixes: string | string[],
): boolean {
  filename = filename.toLowerCase();

  if (typeof suffixes === "string") {
    return filename.endsWith(suffixes);
  }

  return suffixes.some((suffix) => filename.endsWith(suffix));
}

export async function quickBlobParser(
  file: File,
  model: Model,
  onProgress?: (progress: number) => void,
): Promise<string> {
  // this function is used to parse the file quickly in local
  // otherwise, it will be parsed as a file

  if (file.size === 0 || file.name.length === 0) {
    throw new Error("File is empty");
  }

  if (!model.reverse_model) {
    try {
      // if the file is an image, it will be parsed as an image by local parser first
      const couldLocalVision = model.vision_model;
      if (couldLocalVision && file.type.startsWith("image/")) {
        console.log("[parser] hit image/* file, using local parser");
        // parse image as base64 (e.g. result: data:image/png;base64,xxx)
        const base64 = await fileToBase64(file);
        return base64;
      }

      // if the file is txt, parse it as txt
      if (
        file.type === "text/plain" ||
        checkFileSuffix(file.name, [
          "txt",
          "md",
          "markdown",
          "json",
          "xml",
          "csv",
          "yaml",
          "yml",
          "toml",
          "ini",
          "cfg",
          "conf",
        ])
      ) {
        console.log("[parser] hit text/plain file, using local parser");
        return await file.text();
      }
      console.log(file.type);
    } catch (e) {
      console.error(
        "[parser] local parser failed, switch to server parser: ",
        e,
      );
    }
  }

  return blobParser(file, model, onProgress);
}

export async function blobParser(
  file: File,
  model: Model,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const endpoint = trimSuffixes(blobEndpoint, ["/upload", "/"]);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", model.id);
    formData.append("enable_ocr", (model.ocr_model ?? false).toString());
    formData.append("enable_vision", (model.vision_model ?? false).toString());
    formData.append("save_all", (model.reverse_model ?? false).toString());
    xhr.open("POST", `${endpoint}/upload`, true);
    xhr.upload.onprogress = (progressEvent) => {
      console.debug(progressEvent);
      if (progressEvent.lengthComputable) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total,
        );
        console.debug(percentCompleted);
        onProgress?.(percentCompleted);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as BlobParserResponse;
          if (!data.status) {
            reject(new Error(data.error));
          } else if (data.content.length === 0) {
            reject(new Error("Result is empty"));
          } else {
            resolve(data.content);
          }
        } catch (e) {
          reject(new Error("Invalid JSON response"));
        }
      } else {
        reject(new Error(`HTTP error! status: ${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      reject(new Error("Network error"));
    };
    xhr.send(formData);
  });
}
