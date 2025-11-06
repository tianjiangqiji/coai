import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { useState } from "react";
import { useSelector } from "react-redux";
import { selectInit } from "@/store/auth.ts";
import { useEffectAsync } from "@/utils/hook.ts";
import {
  BroadcastInfo,
  createBroadcast,
  getBroadcastList,
  removeBroadcast,
  updateBroadcast,
} from "@/api/broadcast.ts";
import { useTranslation } from "react-i18next";
import { extractMessage } from "@/utils/processor.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  AlertCircle,
  Edit,
  Eye,
  Loader2,
  MoreVertical,
  Plus,
  RotateCcw,
  Trash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import EditorProvider from "@/components/EditorProvider.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { withNotify } from "@/api/common.ts";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import { DialogClose } from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type CreateBroadcastDialogProps = {
  onCreated?: () => void;
};

function CreateBroadcastDialog(props: CreateBroadcastDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  const [content, setContent] = useState<string>("");
  const [notifyAll, setNotifyAll] = useState<boolean>(false);

  async function postBroadcast() {
    const broadcast = content.trim();
    if (broadcast.length === 0) return;
    const resp = await createBroadcast(broadcast, notifyAll);
    if (resp.status) {
      toast.success(t("admin.post-success"), {
        description: t("admin.post-success-prompt"),
      });

      setContent("");
      setNotifyAll(false);

      setOpen(false);
      props.onCreated?.();
    } else {
      toast.error(t("admin.post-failed"), {
        description: t("admin.post-failed-prompt", { reason: resp.error }),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={`default`}>
          <Plus className={`w-4 h-4 mr-1`} />
          {t("admin.create-broadcast")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.create-broadcast")}</DialogTitle>
          <DialogDescription asChild>
            <div className={`pt-4`}>
              <p className="text-sm text-secondary mb-6 border p-2 rounded-md">
                {t("admin.broadcast-tip")}
              </p>
              <Textarea
                placeholder={t("admin.broadcast-placeholder")}
                value={content}
                rows={5}
                onChange={(e) => setContent(e.target.value)}
              />

              <div className="flex items-center space-x-2 mt-4">
                <Checkbox
                  id="notify-all"
                  checked={notifyAll}
                  onCheckedChange={(checked) =>
                    setNotifyAll(checked as boolean)
                  }
                />
                <Label
                  htmlFor="notify-all"
                  className="text-sm font-medium text-primary cursor-pointer"
                >
                  {t("admin.notify-all")}
                </Label>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant={`outline`}>{t("admin.cancel")}</Button>
          </DialogClose>
          <Button
            unClickable
            variant={`default`}
            onClick={postBroadcast}
            loading={true}
          >
            {t("admin.post")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type BroadcastItemProps = {
  item: BroadcastInfo;
  onRefresh?: () => void;
};

function BroadcastItem({ item, onRefresh }: BroadcastItemProps) {
  const { t } = useTranslation();

  const [open, setOpen] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [value, setValue] = useState<string>("");

  return (
    <TableRow>
      <EditorProvider
        title={t("admin.view")}
        value={value || item.content}
        onChange={setValue}
        open={open}
        setOpen={setOpen}
        submittable
        onSubmit={async (value: string) => {
          const resp = await updateBroadcast(item.index, value);
          withNotify(t, resp, true);
          onRefresh?.();
        }}
      />
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.delete-broadcast")}</AlertDialogTitle>
            <AlertDialogDescription>
              <p>{t("admin.delete-broadcast-desc")}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button unClickable variant={`outline`}>
              {t("cancel")}
            </Button>
            <Button
              unClickable
              variant={`destructive`}
              onClick={async () => {
                const resp = await removeBroadcast(item.index);
                withNotify(t, resp, true);
                onRefresh?.();
                if (resp.status) setDialogOpen(false);
              }}
            >
              {t("delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TableCell>{item.index}</TableCell>
      <TableCell>{extractMessage(item.content, 25)}</TableCell>
      <TableCell>{item.poster}</TableCell>
      <TableCell>{item.created_at}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={`outline`} size={`icon`}>
              <MoreVertical className={`w-4 h-4`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={`end`}>
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Eye className={`w-4 h-4 mr-1.5`} />
              {t("admin.view")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Edit className={`w-4 h-4 mr-1.5`} />
              {t("edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialogOpen(true)}>
              <Trash className={`w-4 h-4 mr-1.5`} />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function BroadcastTable() {
  const { t } = useTranslation();
  const init = useSelector(selectInit);
  const [data, setData] = useState<BroadcastInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const doRefresh = async () => {
    if (!init) return;

    setLoading(true);
    setData(await getBroadcastList());
    setLoading(false);
  };

  useEffectAsync(doRefresh, [init]);

  return (
    <div className={`broadcast-table whitespace-nowrap`}>
      <div className={`broadcast-action flex flex-row flex-nowrap w-full mb-4`}>
        <Button
          variant={`outline`}
          size={`icon`}
          className={`select-none`}
          onClick={async () => {
            setData(await getBroadcastList());
          }}
        >
          <RotateCcw className={`w-4 h-4`} />
        </Button>
        <div className={`grow`} />
        <CreateBroadcastDialog onCreated={doRefresh} />
      </div>
      <Alert className={`pb-2 mb-4`}>
        <AlertCircle className={`h-4 w-4`} />
        <AlertDescription className={`break-all whitespace-pre-wrap`}>
          {t("admin.broadcast-tip")}
        </AlertDescription>
      </Alert>

      {data.length ? (
        <Table>
          <TableHeader>
            <TableRow className={`select-none whitespace-nowrap`}>
              <TableHead>ID</TableHead>
              <TableHead>{t("admin.broadcast-content")}</TableHead>
              <TableHead>{t("admin.poster")}</TableHead>
              <TableHead>{t("admin.post-at")}</TableHead>
              <TableHead>{t("admin.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, idx) => (
              <BroadcastItem key={idx} item={item} onRefresh={doRefresh} />
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={`text-center select-none my-8`}>
          {loading ? (
            <Loader2 className={`w-6 h-6 inline-block animate-spin`} />
          ) : (
            <p className={`empty`}>{t("admin.empty")}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default BroadcastTable;
