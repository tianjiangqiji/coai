import { useTranslation } from "react-i18next";
import { useMemo, useReducer, useState } from "react";
import {
  CommonResponse,
  UserData,
  UserForm,
  UserResponse,
} from "@/admin/types.ts";
import {
  banUserOperation,
  getUserList,
  initialUserFilter,
  quotaOperation,
  releaseUsageOperation,
  setAdminOperation,
  subscriptionLevelOperation,
  subscriptionOperation,
  updateEmail,
  updatePassword,
  UserFilterProps,
} from "@/admin/api/chart.ts";
import { useEffectAsync } from "@/utils/hook.ts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  ArrowDownNarrowWide,
  CalendarCheck2,
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  CloudCog,
  CloudFog,
  Filter,
  KeyRound,
  Loader2,
  Mail,
  MinusCircle,
  MoreHorizontal,
  PlusCircle,
  RotateCw,
  Search,
  Shield,
  ShieldMinus,
} from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import PopupDialog, { popupTypes } from "@/components/PopupDialog.tsx";
import { getNumber, isEnter, parseNumber } from "@/utils/base.ts";
import { useSelector } from "react-redux";
import { selectUsername } from "@/store/auth.ts";
import { PaginationAction } from "@/components/ui/pagination.tsx";
import Tips from "@/components/Tips.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
  DialogTitle,
  DialogFooter,
  DialogAction,
} from "@/components/ui/dialog.tsx";
import { RadioBox } from "@/components/ui/radio-box.tsx";
import { formReducer } from "@/utils/form.ts";
import { Separator } from "@/components/ui/separator.tsx";
import { toast } from "sonner";
import { Badge } from "../ui/badge";

type OperationMenuProps = {
  user: UserData;
  onRefresh?: () => void;
};

export enum UserType {
  normal = "normal",
  basic_plan = "basic_plan",
  standard_plan = "standard_plan",
  pro_plan = "pro_plan",
}

export const userTypeArray = [
  UserType.normal,
  UserType.basic_plan,
  UserType.standard_plan,
  UserType.pro_plan,
];

function doToast(t: any, resp: CommonResponse) {
  if (!resp.status)
    toast.error(t("admin.operate-failed"), {
      description: t("admin.operate-failed-prompt", {
        reason: resp.message || resp.error,
      }),
    });
  else
    toast.success(t("admin.operate-success"), {
      description: t("admin.operate-success-prompt"),
    });
}

function OperationMenu({ user, onRefresh }: OperationMenuProps) {
  const { t } = useTranslation();

  const username = useSelector(selectUsername);

  const [passwordOpen, setPasswordOpen] = useState<boolean>(false);
  const [emailOpen, setEmailOpen] = useState<boolean>(false);
  const [quotaOpen, setQuotaOpen] = useState<boolean>(false);
  const [quotaSetOpen, setQuotaSetOpen] = useState<boolean>(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState<boolean>(false);
  const [subscriptionLevelOpen, setSubscriptionLevelOpen] =
    useState<boolean>(false);
  const [releaseOpen, setReleaseOpen] = useState<boolean>(false);
  const [banOpen, setBanOpen] = useState<boolean>(false);
  const [adminOpen, setAdminOpen] = useState<boolean>(false);

  return (
    <>
      <PopupDialog
        destructive={true}
        type={popupTypes.Text}
        title={t("admin.password-action")}
        name={t("auth.password")}
        description={t("admin.password-action-desc")}
        open={passwordOpen}
        setOpen={setPasswordOpen}
        defaultValue={""}
        onSubmit={async (password) => {
          const resp = await updatePassword(user.id, password);
          doToast(t, resp);

          if (resp.status) {
            username === user.username && location.reload();
            onRefresh?.();
          }

          return resp.status;
        }}
      />
      <PopupDialog
        destructive={true}
        type={popupTypes.Text}
        title={t("admin.email-action")}
        name={t("admin.email")}
        description={t("admin.email-action-desc")}
        open={emailOpen}
        setOpen={setEmailOpen}
        defaultValue={user.email}
        onSubmit={async (email) => {
          const resp = await updateEmail(user.id, email);
          doToast(t, resp);

          if (resp.status) onRefresh?.();
          return resp.status;
        }}
      />
      <PopupDialog
        type={popupTypes.Number}
        title={t("admin.quota-action")}
        name={t("admin.quota")}
        description={t("admin.quota-action-desc")}
        defaultValue={"0"}
        onValueChange={getNumber}
        open={quotaOpen}
        setOpen={setQuotaOpen}
        componentProps={{ acceptNegative: true }}
        onSubmit={async (value) => {
          const quota = parseNumber(value);
          const resp = await quotaOperation(user.id, quota);
          doToast(t, resp);

          if (resp.status) onRefresh?.();
          return resp.status;
        }}
      />
      <PopupDialog
        type={popupTypes.Number}
        title={t("admin.quota-set-action")}
        name={t("admin.quota")}
        description={t("admin.quota-set-action-desc")}
        defaultValue={user.quota.toFixed(2)}
        onValueChange={getNumber}
        open={quotaSetOpen}
        setOpen={setQuotaSetOpen}
        componentProps={{ acceptNegative: true }}
        onSubmit={async (value) => {
          const quota = parseNumber(value);
          const resp = await quotaOperation(user.id, quota, true);
          doToast(t, resp);

          if (resp.status) onRefresh?.();
          return resp.status;
        }}
      />
      <PopupDialog
        type={popupTypes.Clock}
        title={t("admin.subscription-action")}
        description={t("admin.subscription-action-desc", {
          username: user.username,
        })}
        defaultValue={user.expired_at || new Date().toISOString().slice(0, 19).replace('T', ' ')}
        open={subscriptionOpen}
        setOpen={setSubscriptionOpen}
        onSubmit={async (value) => {
          const resp = await subscriptionOperation(user.id, value);
          doToast(t, resp);

          if (resp.status) onRefresh?.();
          return resp.status;
        }}
      />
      <PopupDialog
        type={popupTypes.List}
        title={t("admin.subscription-level")}
        name={t("admin.level")}
        description={t("admin.subscription-level-desc")}
        defaultValue={userTypeArray[user.level]}
        params={{
          dataList: userTypeArray,
          dataListTranslated: "admin.identity",
        }}
        open={subscriptionLevelOpen}
        setOpen={setSubscriptionLevelOpen}
        onSubmit={async (value) => {
          const level = userTypeArray.indexOf(value as UserType);
          console.log(level);
          const resp = await subscriptionLevelOperation(user.id, level);
          doToast(t, resp);

          if (resp.status) onRefresh?.();
          return resp.status;
        }}
      />
      <PopupDialog
        type={popupTypes.Empty}
        title={t("admin.release-subscription-action")}
        name={t("admin.release-subscription")}
        description={t("admin.release-subscription-action-desc")}
        open={releaseOpen}
        setOpen={setReleaseOpen}
        onSubmit={async () => {
          const resp = await releaseUsageOperation(user.id);
          doToast(t, resp);

          if (resp.status) onRefresh?.();
          return resp.status;
        }}
      />
      <PopupDialog
        disabled={username === user.username}
        destructive={true}
        type={popupTypes.Empty}
        title={user.is_banned ? t("admin.unban-action") : t("admin.ban-action")}
        description={
          user.is_banned
            ? t("admin.unban-action-desc")
            : t("admin.ban-action-desc")
        }
        open={banOpen}
        setOpen={setBanOpen}
        onSubmit={async () => {
          const resp = await banUserOperation(user.id, !user.is_banned);
          doToast(t, resp);

          if (resp.status) onRefresh?.();
          return resp.status;
        }}
      />
      <PopupDialog
        disabled={username === user.username}
        destructive={true}
        type={popupTypes.Empty}
        title={
          user.is_admin
            ? t("admin.cancel-admin-action")
            : t("admin.set-admin-action")
        }
        description={
          user.is_admin
            ? t("admin.cancel-admin-action-desc")
            : t("admin.set-admin-action-desc")
        }
        open={adminOpen}
        setOpen={setAdminOpen}
        onSubmit={async () => {
          const resp = await setAdminOperation(user.id, !user.is_admin);
          doToast(t, resp);

          if (resp.status) onRefresh?.();
          return resp.status;
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={`outline`} size={`icon`}>
            <MoreHorizontal className={`h-4 w-4`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className={`min-w-[8.75rem]`}>
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound className={`h-4 w-4 mr-2`} />
            {t("admin.password-action")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEmailOpen(true)}>
            <Mail className={`h-4 w-4 mr-2`} />
            {t("admin.email-action")}
          </DropdownMenuItem>
          {user.is_banned ? (
            <DropdownMenuItem onClick={() => setBanOpen(true)}>
              <PlusCircle className={`h-4 w-4 mr-2`} />
              {t("admin.unban-action")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setBanOpen(true)}>
              <MinusCircle className={`h-4 w-4 mr-2`} />
              {t("admin.ban-action")}
            </DropdownMenuItem>
          )}
          {user.is_admin ? (
            <DropdownMenuItem onClick={() => setAdminOpen(true)}>
              <ShieldMinus className={`h-4 w-4 mr-2`} />
              {t("admin.cancel-admin-action")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setAdminOpen(true)}>
              <Shield className={`h-4 w-4 mr-2`} />
              {t("admin.set-admin-action")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setQuotaOpen(true)}>
            <CloudFog className={`h-4 w-4 mr-2`} />
            {t("admin.quota-action")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setQuotaSetOpen(true)}>
            <CloudCog className={`h-4 w-4 mr-2`} />
            {t("admin.quota-set-action")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSubscriptionOpen(true)}>
            <CalendarClock className={`h-4 w-4 mr-2`} />
            {t("admin.subscription-action")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSubscriptionLevelOpen(true)}>
            <CalendarCheck2 className={`h-4 w-4 mr-2`} />
            {t("admin.subscription-level")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setReleaseOpen(true)}>
            <CalendarOff className={`h-4 w-4 mr-2`} />
            {t("admin.release-subscription-action")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function UserTable() {
  const { t } = useTranslation();
  const [data, setData] = useState<UserForm>({
    total: 0,
    data: [],
  });
  const [page, setPage] = useState<number>(0);
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [filter, filterDispatch] = useReducer(formReducer<UserFilterProps>(), {
    ...initialUserFilter,
  });

  const [filterDialog, setFilterDialog] = useState<boolean>(false);

  const filterConds = useMemo((): number => {
    return Object.values(filter).filter(
      (value) => value !== "all" && value !== "id-asc",
    ).length;
  }, [filter]);

  async function update() {
    setLoading(true);
    const resp = await getUserList(page, search, filter);
    setLoading(false);
    if (resp.status) setData(resp as UserResponse);
    else
      toast.error(t("admin.error"), {
        description: resp.message,
      });
  }
  useEffectAsync(update, [page]);

  return (
    <div className={`user-table`}>
      <div className={`flex flex-row mb-6`}>
        <Dialog open={filterDialog} onOpenChange={setFilterDialog}>
          <DialogTrigger asChild>
            <Button size={`icon`} className={`shrink-0 mr-2`} onClick={update}>
              <Filter className={`h-4 w-4`} />
              {filterConds > 0 && (
                <span className={`text-xs`}>{filterConds}</span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{t("filter.filter")}</DialogTitle>
            <DialogDescription>
              {t("filter.conds", { count: filterConds })}
            </DialogDescription>
            <div className={`flex flex-col`}>
              <RadioBox
                title={t("filter.admin")}
                icon={<Shield />}
                prefix="admin"
                items={[
                  { id: "all", value: t("filter.all") },
                  { id: "yes", value: t("filter.admin") },
                  { id: "no", value: t("filter.not-admin") },
                ]}
                value={filter.admin}
                onValueChange={(value) =>
                  filterDispatch({ type: "update:admin", value })
                }
              />
              <RadioBox
                title={t("filter.ban")}
                icon={<ShieldMinus />}
                prefix="ban"
                items={[
                  { id: "all", value: t("filter.all") },
                  { id: "yes", value: t("filter.banned") },
                  { id: "no", value: t("filter.not-banned") },
                ]}
                value={filter.ban}
                onValueChange={(value) =>
                  filterDispatch({ type: "update:ban", value })
                }
              />
              <RadioBox
                title={t("filter.plan")}
                icon={<CalendarPlus />}
                prefix="plan"
                items={[
                  { id: "all", value: t("filter.all") },
                  { id: "yes", value: t("filter.subscribed") },
                  { id: "no", value: t("filter.unsubscribed") },
                ]}
                value={filter.plan}
                onValueChange={(value) =>
                  filterDispatch({ type: "update:plan", value })
                }
              />
              <Separator />
              <RadioBox
                title={t("filter.sorts.sort")}
                icon={<ArrowDownNarrowWide />}
                prefix="sort"
                colLayout
                className={`mt-2`}
                items={[
                  // id-desc, id-asc
                  { id: "id-asc", value: t("filter.sorts.id-asc") },
                  { id: "id-desc", value: t("filter.sorts.id-desc") },

                  // quota-desc, quota-asc
                  { id: "quota-asc", value: t("filter.sorts.quota-asc") },
                  { id: "quota-desc", value: t("filter.sorts.quota-desc") },

                  // used-quota-desc, used-quota-asc
                  {
                    id: "used-quota-asc",
                    value: t("filter.sorts.used-quota-asc"),
                  },
                  {
                    id: "used-quota-desc",
                    value: t("filter.sorts.used-quota-desc"),
                  },

                  // plan-desc, plan-asc
                  { id: "plan-asc", value: t("filter.sorts.plan-asc") },
                  { id: "plan-desc", value: t("filter.sorts.plan-desc") },
                ]}
                value={filter.sort}
                onValueChange={(value) =>
                  filterDispatch({ type: "update:sort", value })
                }
              />
            </div>
            <DialogFooter>
              <DialogAction onClick={() => setFilterDialog(false)}>
                {t("confirm")}
              </DialogAction>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Input
          className={`search`}
          placeholder={t("admin.search-username")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={async (e) => {
            if (isEnter(e)) await update();
          }}
        />
        <Button size={`icon`} className={`flex-shrink-0 ml-2`} onClick={update}>
          <Search className={`h-4 w-4`} />
        </Button>
      </div>
      {(data.data && data.data.length > 0) || page > 0 ? (
        <>
          <Table>
            <TableHeader>
              <TableRow className={`select-none whitespace-nowrap`}>
                <TableHead>ID</TableHead>
                <TableHead>{t("admin.username")}</TableHead>
                <TableHead>{t("admin.email")}</TableHead>
                <TableHead>{t("admin.quota")}</TableHead>
                <TableHead>{t("admin.used-quota")}</TableHead>
                <TableHead>{t("admin.is-subscribed")}</TableHead>
                <TableHead>{t("admin.level")}</TableHead>
                <TableHead>{t("admin.total-month")}</TableHead>
                <TableHead>{t("admin.expired-at")}</TableHead>
                <TableHead>{t("admin.is-banned")}</TableHead>
                <TableHead>{t("admin.is-admin")}</TableHead>
                <TableHead>{t("admin.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.data || []).map((user, idx) => (
                <TableRow key={idx}>
                  <TableCell>{user.id}</TableCell>
                  <TableCell className={`whitespace-nowrap`}>
                    {user.username}
                  </TableCell>
                  <TableCell className={`whitespace-nowrap`}>
                    {user.email || "-"}
                  </TableCell>
                  <TableCell>{user.quota}</TableCell>
                  <TableCell>{user.used_quota}</TableCell>
                  <TableCell>
                    {t(user.is_subscribed.toString())}
                    <Tips
                      className={`inline-block`}
                      content={t("admin.is-subscribed-tips")}
                    />
                  </TableCell>
                  <TableCell className={`whitespace-nowrap`}>
                    <Badge variant={`outline`}>
                      {t(`admin.identity.${userTypeArray[user.level]}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.total_month}</TableCell>
                  <TableCell className={`whitespace-nowrap`}>
                    {user.expired_at || "-"}
                  </TableCell>
                  <TableCell>{t(user.is_banned.toString())}</TableCell>
                  <TableCell>{t(user.is_admin.toString())}</TableCell>
                  <TableCell>
                    <OperationMenu user={user} onRefresh={update} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationAction
            current={page}
            total={data.total}
            onPageChange={setPage}
            offset
          />
        </>
      ) : loading ? (
        <div className={`flex flex-col mb-4 mt-12 items-center`}>
          <Loader2 className={`w-6 h-6 inline-block animate-spin`} />
        </div>
      ) : (
        <div className={`empty`}>
          <p>{t("admin.empty")}</p>
        </div>
      )}
      <div className={`user-action`}>
        <div className={`grow`} />
        <Button variant={`outline`} size={`icon`} onClick={update}>
          <RotateCw className={`h-4 w-4`} />
        </Button>
      </div>
    </div>
  );
}

export default UserTable;
