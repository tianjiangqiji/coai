import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Loader2,
  Paperclip,
  X,
  FileIcon,
  FileTextIcon,
  FileImageIcon,
  FileVideoIcon,
  FileAudioIcon,
  FileSpreadsheetIcon,
  FileArchiveIcon,
  FileCodeIcon,
  FileJsonIcon,
  FileVideo2Icon,
  FileDigitIcon,
  AlarmClock,
} from "lucide-react";

import "@/assets/common/file.less";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { useTranslation } from "react-i18next";
import { useDraggableInput } from "@/utils/dom.ts";
import { FileObject, FileArray, quickBlobParser } from "@/api/file.ts";
import { useSelector } from "react-redux";
import { getModelFromId, isHighContextModel } from "@/conf/model.ts";
import { selectModel, selectSupportModels } from "@/store/chat.ts";
import { ChatAction } from "@/components/home/assemblies/ChatAction.tsx";
import { blobEvent } from "@/events/blob.ts";
import { isB64Image } from "@/utils/base.ts";
import { toast } from "sonner";
import { Badge } from "./ui/badge.tsx";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "./ui/lib/utils.ts";
import { Progress } from "./ui/progress.tsx";

const MaxFileSize = 1024 * 1024 * 100; // 100MB File Size Limit
const MaxPromptSize = 10 * 1024; // 10KB Prompt Size Limit (to avoid token overflow)

type FileTask = {
  id: number;
  file: File;
  progress: number;
};

type FileTaskState = {
  tasks: FileTask[];
};

function fileTaskReducer(state: FileTaskState, action: any): FileTaskState {
  switch (action.type) {
    case "add":
      return { ...state, tasks: [...state.tasks, action.payload] };
    case "remove":
      return {
        ...state,
        tasks: state.tasks.filter((task) => task.id !== action.payload),
      };
    case "update-progress":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.payload.id
            ? { ...task, progress: action.payload.progress }
            : task,
        ),
      };
    default:
      return state;
  }
}

type FileProviderProps = {
  files: FileArray;
  dispatch: (action: Record<string, any>) => void;
};

function FileProvider({ files, dispatch }: FileProviderProps) {
  const { t } = useTranslation();
  const model = useSelector(selectModel);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [tasks, taskDispatch] = useReducer(fileTaskReducer, {
    tasks: [],
  } as FileTaskState);

  const supportModels = useSelector(selectSupportModels);

  useEffect(() => {
    blobEvent.bind(async (file: File | File[]) => {
      setOpen?.(true);
      await triggerFile(Array.isArray(file) ? file : [file]);
    });
  }, []);

  const triggerFile = async (files: (File | null)[]) => {
    setLoading(true);
    for (const file of files) {
      if (!file) continue;
      if (file.size > MaxFileSize) {
        toast.error(t("file.over-size"), {
          description: t("file.over-size-prompt", {
            size: (MaxFileSize / 1024 / 1024).toFixed(),
          }),
        });
      } else {
        const id = Date.now();
        taskDispatch({
          type: "add",
          payload: { id, file, progress: 0 },
        });

        const info = getModelFromId(supportModels, model);
        const task = quickBlobParser(
          file,
          info ?? {
            id: model,
            ocr_model: false,
            vision_model: false,
            reverse_model: false,
          },
          (progress) => {
            console.debug(
              `[parser] task ${id} progress: ${progress.toFixed(2)}%`,
            );
            taskDispatch({
              type: "update-progress",
              payload: { id, progress },
            });
          },
        );

        toast.promise(task, {
          loading: t("file.uploading-prompt"),
          success: (content: string) => {
            addFile({ name: file.name, content, size: file.size });
            taskDispatch({
              type: "remove",
              payload: id,
            });
            return t("file.parse-success-prompt", { file: file.name });
          },
          error: (error: Error) => {
            taskDispatch({
              type: "remove",
              payload: id,
            });
            return t("file.parse-error-prompt", { reason: error.message });
          },
        });
      }
    }
    setLoading(false);
  };

  function addFile(file: FileObject) {
    console.debug(
      `[file] new file was added (filename: ${file.name}, size: ${file.size}, prompt: ${file.content.length})`,
    );
    if (
      file.content.length > MaxPromptSize &&
      !isHighContextModel(supportModels, model) &&
      !isB64Image(file.content)
    ) {
      file.content = file.content.slice(0, MaxPromptSize);
      toast(t("file.max-length"), {
        description: t("file.max-length-prompt"),
      });
    }

    dispatch({ type: "add", payload: file });
  }

  function removeFile(index: number) {
    dispatch({ type: "remove", payload: index });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <ChatAction text={t("file.file")} active={files.length}>
          <Paperclip className={`h-4 w-4`} />
        </ChatAction>
      </DialogTrigger>
      <DialogContent className={`file-dialog flex-dialog`}>
        <DialogHeader>
          <DialogTitle className="flex flex-row items-center">
            {t("file.file")}
            <Badge variant="secondary" className="ml-2">
              {files.length}
            </Badge>
          </DialogTitle>
          <DialogDescription asChild>
            <motion.div
              className={`file-wrapper`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence key="files">
                <FileList value={files} removeFile={removeFile} />
              </AnimatePresence>
              <AnimatePresence key="tasks">
                {tasks.tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.1, delay: index * 0.1 }}
                  >
                    <FileTaskItem task={task} />
                  </motion.div>
                ))}
              </AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <FileInput
                  loading={loading}
                  id={"file"}
                  className={"file"}
                  handleEvent={triggerFile}
                />
              </motion.div>
            </motion.div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

type FileTaskItemProps = {
  task: FileTask;
};

function FileTaskItem({ task }: FileTaskItemProps) {
  return (
    <div className="w-full h-fit flex flex-row items-center py-0.5 select-none">
      <AlarmClock className="w-3.5 h-3.5 mr-1" />
      <div className="truncate">{task.file.name}</div>
      <div className="mr-1 ml-auto text-xs">{task.progress.toFixed()}%</div>
      <Progress value={task.progress} className="w-16 md:w-24 h-2" />
    </div>
  );
}

type FileBadgeProps = {
  name: string;
};

function getFileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function getFileIcon(name: string) {
  const extension = getFileExtension(name);
  switch (extension) {
    case "pdf":
      return FileTextIcon;
    case "doc":
    case "docx":
    case "txt":
      return FileDigitIcon;
    case "xls":
    case "xlsx":
    case "csv":
      return FileSpreadsheetIcon;
    case "ppt":
    case "pptx":
      return FileVideo2Icon;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "svg":
      return FileImageIcon;
    case "mp4":
    case "avi":
    case "mov":
      return FileVideoIcon;
    case "mp3":
    case "wav":
      return FileAudioIcon;
    case "zip":
    case "rar":
    case "7z":
      return FileArchiveIcon;
    case "js":
    case "ts":
    case "py":
    case "java":
    case "cpp":
    case "c":
    case "h":
    case "rs":
    case "swift":
    case "kt":
    case "ktm":
    case "php":
    case "rb":
    case "sh":
    case "html":
    case "css":
    case "scss":
    case "less":
    case "sass":
    case "styl":
    case "vue":
    case "svelte":
    case "astro":
    case "tsx":
    case "jsx":
      return FileCodeIcon;
    case "json":
    case "xml":
    case "jsonl":
    case "yaml":
    case "yml":
    case "toml":
    case "ini":
    case "cfg":
    case "conf":
      return FileJsonIcon;
    default:
      return FileIcon;
  }
}

function FileIconObject({ name }: FileBadgeProps) {
  const IconComponent = useMemo(() => getFileIcon(name), [name]);

  return (
    <div className="w-fit h-fit relative">
      <IconComponent className="stroke-[1.25] h-8 w-8 text-primary/70 group-hover:text-primary transition-colors duration-200" />
    </div>
  );
}

function FileBadge({ name }: FileBadgeProps) {
  const extension = getFileExtension(name);
  return (
    <span
      className={cn(
        "px-1 inline-block mr-1 rounded-sm bg-muted/50 text-2xs text-primary",
        {
          // pdf&ppt: red-500
          "bg-red-500/10 text-red-500":
            extension === "pdf" || extension === "ppt" || extension === "pptx",
          // doc: blue-500
          "bg-blue-500/10 text-blue-500":
            extension === "doc" || extension === "docx",
          // xls: green-500
          "bg-green-500/10 text-green-500":
            extension === "xls" || extension === "xlsx" || extension === "csv",
          // json/xml/etc: orange-500
          "bg-orange-500/10 text-orange-500":
            extension === "json" ||
            extension === "xml" ||
            extension === "jsonl" ||
            extension === "yaml" ||
            extension === "yml" ||
            extension === "toml" ||
            extension === "ini" ||
            extension === "cfg" ||
            extension === "conf",
          // code: violet-500
          "bg-violet-500/10 text-violet-500":
            extension === "js" ||
            extension === "ts" ||
            extension === "py" ||
            extension === "java" ||
            extension === "cpp" ||
            extension === "go" ||
            extension === "c" ||
            extension === "h" ||
            extension === "rs" ||
            extension === "swift" ||
            extension === "kt" ||
            extension === "ktm" ||
            extension === "php" ||
            extension === "rb" ||
            extension === "sh" ||
            extension === "html" ||
            extension === "css" ||
            extension === "scss" ||
            extension === "less" ||
            extension === "sass" ||
            extension === "styl" ||
            extension === "vue" ||
            extension === "svelte" ||
            extension === "astro" ||
            extension === "tsx" ||
            extension === "jsx" ||
            extension === "ts" ||
            extension === "jsx",
        },
      )}
    >
      {extension.toUpperCase()}
    </span>
  );
}

type FileListProps = {
  value: FileArray;
  removeFile: (index: number) => void;
};

function FileList({ value, removeFile }: FileListProps) {
  if (value.length === 0) return null;

  const listVariants = {
    hidden: { opacity: 0, height: 0 },
    visible: { opacity: 1, height: "auto" },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className={`file-list grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-2.5 justify-center`}
      initial="hidden"
      animate="visible"
      variants={listVariants}
    >
      <AnimatePresence>
        {value.map((file, index) => (
          <motion.div
            className={`relative h-fit pt-3 flex flex-col items-center justify-between bg-gradient-to-tr from-background to-muted/25 border hover:border-primary/40 cursor-pointer rounded-lg p-2 shadow-sm transition-all duration-200 ease-in-out group md:pt-4 md:p-3`}
            key={index}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={itemVariants}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex pt-1 flex-col items-center w-full h-fit">
              <FileIconObject name={file.name} />
              <span
                className={`mt-0.5 text-xs font-medium truncate max-w-[95%] text-center md:mt-1 md:text-sm`}
              >
                {file.name}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span
                className={`text-[10px] text-muted-foreground flex flex-row items-center mt-0.5 md:text-xs`}
              >
                <FileBadge name={file.name} />
                {((file.size || file.content.length) / 1024).toFixed(2)}KB
              </span>
              <button
                className="absolute group w-fit h-fit top-1 right-1 p-0.5 rounded-full hover:bg-secondary/10 transition-colors duration-200 md:top-2 md:right-2 md:p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
              >
                <X
                  className={`h-3 w-3 text-secondary hover:text-destructive transition-colors duration-200 md:h-4 md:w-4`}
                />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

type FileInputProps = {
  id: string;
  loading: boolean;
  className?: string;
  handleEvent: (files: (File | null)[]) => void;
};

function FileInput({ id, loading, className, handleEvent }: FileInputProps) {
  const { t } = useTranslation();
  const ref = useRef(null);

  useEffect(() => {
    return useDraggableInput(window.document.body, handleEvent);
  }, []);

  return (
    <>
      <label className={`drop-window`} htmlFor={id} ref={ref}>
        {loading && <Loader2 className={`h-4 w-4 animate-spin mr-2`} />}
        <p>{t("file.drop")}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {[
            { icon: FileIcon, text: "Text" },
            { icon: FileVideo2Icon, text: "PPT" },
            { icon: FileDigitIcon, text: "Word" },
            { icon: FileTextIcon, text: "PDF" },
            { icon: FileSpreadsheetIcon, text: "Excel" },
            { icon: FileImageIcon, text: "Image" },
            { icon: FileAudioIcon, text: "Audio" },
            { icon: FileCodeIcon, text: "Code" },
            { icon: FileJsonIcon, text: "Data" },
          ].map((item, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <div className="w-10 h-10 rounded-full bg-muted/50 p-2 hover:bg-muted/70 transition-colors duration-200">
                <item.icon className="w-full h-full text-secondary stroke-[1.5]" />
              </div>
              <span className="mt-0.5 text-xs font-medium text-muted-foreground">
                {item.text}
              </span>
            </motion.div>
          ))}
        </div>
      </label>
      <input
        id={id}
        type="file"
        className={className}
        onChange={(e) => handleEvent(Array.from(e.target?.files || []))}
        accept="*"
        style={{ display: "none" }}
        multiple={true}
        // on transfer file
        onPaste={(e) => {
          const items = e.clipboardData.items;
          const files = Array.from(items).filter(
            (item) => item.kind === "file",
          );
          handleEvent(files.map((file) => file.getAsFile()));
        }}
      />
    </>
  );
}

export default FileProvider;
