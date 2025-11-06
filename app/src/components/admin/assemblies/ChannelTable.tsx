import {
  ColumnsVisibilityBar,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  useColumnsVisibility,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Activity,
  ArrowDown10,
  Blocks,
  Check,
  Circle,
  Plus,
  RotateCw,
  Search,
  Settings2,
  Sheet,
  SquareAsterisk,
  Trash,
  Weight,
  Workflow,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import OperationAction from "@/components/OperationAction.tsx";
import { Dispatch, useEffect, useMemo, useState } from "react";
import { Channel, getShortChannelType } from "@/admin/channel.ts";
import { withNotify } from "@/api/common.ts";
import { useTranslation } from "react-i18next";
import { useEffectAsync } from "@/utils/hook.ts";
import {
  activateChannel,
  deactivateChannel,
  deleteChannel,
  listChannel,
} from "@/admin/api/channel.ts";
import { cn } from "@/components/ui/lib/utils.ts";
import { getApiModels } from "@/api/v1.ts";
import { getHostName } from "@/utils/base.ts";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { DialogClose } from "@radix-ui/react-dialog";
import { ChannelTypeAvatar } from "@/components/ModelAvatar.tsx";

type ChannelTableProps = {
  display: boolean;
  dispatch: Dispatch<any>;
  setId: (id: number) => void;
  setEnabled: (enabled: boolean) => void;
  data: Channel[];
  setData: (data: Channel[]) => void;
};

type TypeBadgeProps = {
  type: string;
  className?: string;
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "gold"
    | null
    | undefined;
};

export function TypeBadge({ type, className, variant }: TypeBadgeProps) {
  const content = useMemo(() => getShortChannelType(type), [type]);

  return (
    <Badge
      className={cn(`select-none w-max cursor-pointer`, className)}
      variant={variant}
    >
      {content || type}
    </Badge>
  );
}

type SyncDialogProps = {
  dispatch: Dispatch<any>;
  open: boolean;
  setOpen: (open: boolean) => void;
};

function SyncDialog({ dispatch, open, setOpen }: SyncDialogProps) {
  const { t } = useTranslation();
  const [endpoint, setEndpoint] = useState<string>("https://api.ccode.vip");
  const [secret, setSecret] = useState<string>("");

  const submit = async (endpoint: string): Promise<boolean> => {
    endpoint = endpoint.trim();
    endpoint.endsWith("/") && (endpoint = endpoint.slice(0, -1));

    const resp = await getApiModels(secret, { endpoint });
    withNotify(t, resp, true);

    if (!resp.status) return false;

    const name = getHostName(endpoint).replace(/\./g, "-");
    const data: Channel = {
      id: -1,
      name,
      type: "openai",
      models: resp.data,
      priority: 0,
      weight: 1,
      retry: 3,
      secret,
      endpoint,
      mapper: "",
      state: true,
      group: [],
      proxy: { proxy: "", proxy_type: 0, username: "", password: "" },
    };

    dispatch({ type: "set", value: data });
    return true;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.channels.joint")}</DialogTitle>
          </DialogHeader>
          <div className={`pt-2 flex flex-col`}>
            <div className={`flex flex-row items-center mb-4`}>
              <Label className={`mr-2 whitespace-nowrap`}>
                {t("admin.channels.joint-endpoint")}
              </Label>
              <Input
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={t("admin.channels.upstream-endpoint-placeholder")}
              />
            </div>
            <div className={`flex flex-row items-center`}>
              <Label className={`mr-2 whitespace-nowrap`}>
                {t("admin.channels.secret")}
              </Label>
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={t("admin.channels.sync-secret-placeholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant={`outline`}>{t("cancel")}</Button>
            </DialogClose>
            <Button
              unClickable
              className={`mb-1`}
              onClick={async () => {
                const status = await submit(endpoint);
                status && setOpen(false);
              }}
            >
              {t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChannelTable({
  display,
  dispatch,
  setId,
  setEnabled,
  data,
  setData,
}: ChannelTableProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  const [blockDisplayType, setBlockDisplayType] = useState<boolean>(false);

  const refresh = async () => {
    setLoading(true);
    const resp = await listChannel();
    setLoading(false);
    if (!resp.status) withNotify(t, resp);
    else setData(resp.data);
  };
  useEffectAsync(refresh, []);
  useEffectAsync(refresh, [display]);

  useEffect(() => {
    if (display) setId(-1);
  }, [display]);

  const { bar, toggle, merge } = useColumnsVisibility(
    {
      id: true,
      name: true,
      type: true,
      priority: true,
      weight: true,
      ["secret-number"]: true,
      ["retry-name"]: true,
      state: true,
      action: true,
    },
    { translatePrefix: "admin.channels" },
  );

  const channels = useMemo(() => {
    const v = data || [];
    const s = search.trim().toLowerCase();
    if (s.trim() === "") return v;

    return v.filter((x) => {
      return (
        x.name.toLowerCase().includes(s) ||
        x.type.toLowerCase().includes(s) ||
        x.secret.toLowerCase().includes(s) ||
        x.models.some((m) => m.toLowerCase().includes(s))
      );
    });
  }, [search, data]);

  return (
    display && (
      <div>
        <SyncDialog
          open={open}
          setOpen={setOpen}
          dispatch={(action) => {
            dispatch(action);
            setEnabled(true);
            setId(-1);
          }}
        />
        <div className={`flex flex-row w-full h-max`}>
          <Button
            className={`mr-2 shrink-0`}
            onClick={() => {
              setEnabled(true);
              setId(-1);
            }}
          >
            <Plus className={`h-4 w-4 mr-1`} />
            {t("admin.channels.create")}
          </Button>
          <Button
            className={`mr-2 shrink-0`}
            variant={`outline`}
            onClick={() => setOpen(true)}
          >
            <Activity className={`h-4 w-4 mr-1`} />
            {t("admin.channels.joint")}
          </Button>
          <Button
            variant={`outline`}
            size={`icon`}
            className={`ml-auto`}
            onClick={() => setBlockDisplayType(!blockDisplayType)}
          >
            {blockDisplayType ? (
              <Blocks className={`h-4 w-4`} />
            ) : (
              <Sheet className={`h-4 w-4`} />
            )}
          </Button>
          <ColumnsVisibilityBar bar={bar} toggle={toggle} />
        </div>
        <div className={`flex flex-row items-center mt-4`}>
          <Button className={`shrink-0 mr-2`} size={`icon`}>
            <Search className={`h-4 w-4`} />
          </Button>
          <Input
            className={`grow`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.channels.search-channel")}
          />
          <Button
            variant={`outline`}
            size={`icon`}
            className={`ml-2 shrink-0`}
            onClick={refresh}
          >
            <RotateCw className={cn(`h-4 w-4`, loading && `animate-spin`)} />
          </Button>
        </div>
        {!blockDisplayType ? (
          <Table className={`channel-table mt-4`}>
            <TableHeader>
              <TableRow className={`select-none whitespace-nowrap`}>
                <TableCell className={merge("id")}>
                  {t("admin.channels.id")}
                </TableCell>
                <TableCell className={merge("name")}>
                  {t("admin.channels.name")}
                </TableCell>
                <TableCell className={merge("type")}>
                  {t("admin.channels.type")}
                </TableCell>
                <TableCell className={merge("priority")}>
                  {t("admin.channels.priority")}
                </TableCell>
                <TableCell className={merge("weight")}>
                  {t("admin.channels.weight")}
                </TableCell>
                <TableCell className={merge("secret-number")}>
                  {t("admin.channels.secret-number")}
                </TableCell>
                <TableCell className={merge("retry-name")}>
                  {t("admin.channels.retry-name")}
                </TableCell>
                <TableCell className={merge("state")}>
                  {t("admin.channels.state")}
                </TableCell>
                <TableCell className={merge("action")}>
                  {t("admin.channels.action")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((chan, idx) => (
                <TableRow key={idx}>
                  <TableCell className={merge("id", `channel-id select-none`)}>
                    #{chan.id}
                  </TableCell>
                  <TableCell className={merge("name")}>{chan.name}</TableCell>
                  <TableCell className={merge("type")}>
                    <TypeBadge type={chan.type} />
                  </TableCell>
                  <TableCell className={merge("priority")}>
                    {chan.priority}
                  </TableCell>
                  <TableCell className={merge("weight")}>
                    {chan.weight}
                  </TableCell>
                  <TableCell className={merge("secret-number")}>
                    {chan.secret.split("\n").filter((x) => x).length}
                  </TableCell>
                  <TableCell className={merge("retry-name")}>
                    {chan.retry}
                  </TableCell>
                  <TableCell className={merge("state")}>
                    {chan.state ? (
                      <Check className={`h-4 w-4 text-green-500`} />
                    ) : (
                      <X className={`h-4 w-4 text-destructive`} />
                    )}
                  </TableCell>
                  <TableCell
                    className={merge("action", `flex flex-row flex-wrap gap-2`)}
                  >
                    <OperationAction
                      tooltip={t("admin.channels.edit")}
                      onClick={() => {
                        setEnabled(true);
                        setId(chan.id);
                      }}
                    >
                      <Settings2 className={`h-4 w-4`} />
                    </OperationAction>
                    {chan.state ? (
                      <OperationAction
                        tooltip={t("admin.channels.disable")}
                        variant={`destructive`}
                        onClick={async () => {
                          const resp = await deactivateChannel(chan.id);
                          withNotify(t, resp, true);
                          await refresh();
                        }}
                      >
                        <X className={`h-4 w-4`} />
                      </OperationAction>
                    ) : (
                      <OperationAction
                        tooltip={t("admin.channels.enable")}
                        onClick={async () => {
                          const resp = await activateChannel(chan.id);
                          withNotify(t, resp, true);
                          await refresh();
                        }}
                      >
                        <Check className={`h-4 w-4`} />
                      </OperationAction>
                    )}
                    <OperationAction
                      tooltip={t("admin.channels.delete")}
                      variant={`destructive`}
                      onClick={async () => {
                        const resp = await deleteChannel(chan.id);
                        withNotify(t, resp, true);
                        await refresh();
                      }}
                    >
                      <Trash className={`h-4 w-4`} />
                    </OperationAction>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4`}>
            {channels.map((chan, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setEnabled(true);
                  setId(chan.id);
                }}
                className={`flex flex-col p-4 border rounded-md cursor-pointer select-none hover:bg-background-hover transition`}
              >
                <div className={`flex flex-row items-center w-full`}>
                  <Circle
                    className={cn(
                      `h-3 w-3 stroke-[3.5] mr-1.5`,
                      chan.state ? `text-green-500` : `text-destructive`,
                    )}
                  />
                  <span className={`mr-1`}>{chan.name}</span>
                  <Badge variant={`outline`} className={`select-none`}>
                    #{chan.id}
                  </Badge>
                  <TypeBadge type={chan.type} className={`ml-auto`} />
                </div>
                <div className={`mt-1 grid grid-cols-2 gap-1`}>
                  <div className={`flex flex-row items-center`}>
                    <ArrowDown10 className={`h-3.5 w-3.5`} />
                    <Label className={`whitespace-nowrap ml-1 mr-2`}>
                      {t("admin.channels.priority")}
                    </Label>
                    <span className={`font-bold`}>{chan.priority}</span>
                  </div>
                  <div className={`flex flex-row items-center`}>
                    <Weight className={`h-3.5 w-3.5`} />
                    <Label className={`whitespace-nowrap ml-1 mr-2`}>
                      {t("admin.channels.weight")}
                    </Label>
                    <span className={`font-bold`}>{chan.weight}</span>
                  </div>
                  <div className={`flex flex-row items-center`}>
                    <SquareAsterisk className={`h-3.5 w-3.5`} />
                    <Label className={`whitespace-nowrap ml-1 mr-2`}>
                      {t("admin.channels.secret-number")}
                    </Label>
                    <span className={`font-bold`}>
                      {chan.secret.split("\n").filter((x) => x).length}
                    </span>
                  </div>
                  <div className={`flex flex-row items-center`}>
                    <Workflow className={`h-3.5 w-3.5`} />
                    <Label className={`whitespace-nowrap ml-1 mr-2`}>
                      {t("admin.channels.retry-name")}
                    </Label>
                    <span className={`font-bold`}>{chan.retry}</span>
                  </div>
                </div>
                <div className={`flex flex-row items-center space-x-1 mt-2`}>
                  <OperationAction
                    tooltip={t("admin.channels.edit")}
                    onClick={() => {
                      setEnabled(true);
                      setId(chan.id);
                    }}
                  >
                    <Settings2 className={`h-4 w-4`} />
                  </OperationAction>
                  {chan.state ? (
                    <OperationAction
                      tooltip={t("admin.channels.disable")}
                      variant={`destructive`}
                      onClick={async () => {
                        const resp = await deactivateChannel(chan.id);
                        withNotify(t, resp, true);
                        await refresh();
                      }}
                    >
                      <X className={`h-4 w-4`} />
                    </OperationAction>
                  ) : (
                    <OperationAction
                      tooltip={t("admin.channels.enable")}
                      onClick={async () => {
                        const resp = await activateChannel(chan.id);
                        withNotify(t, resp, true);
                        await refresh();
                      }}
                    >
                      <Check className={`h-4 w-4`} />
                    </OperationAction>
                  )}
                  <OperationAction
                    tooltip={t("admin.channels.delete")}
                    variant={`destructive`}
                    onClick={async () => {
                      const resp = await deleteChannel(chan.id);
                      withNotify(t, resp, true);
                      await refresh();
                    }}
                  >
                    <Trash className={`h-4 w-4`} />
                  </OperationAction>
                  <div className={`grow`} />
                  <ChannelTypeAvatar type={chan.type} size={28} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  );
}

export default ChannelTable;
