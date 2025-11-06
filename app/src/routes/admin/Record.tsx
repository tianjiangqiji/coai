import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Loader2, RotateCw, Search } from "lucide-react";
import { useEffectAsync } from "@/utils/hook.ts";
import { getUsageLogList, UsageLogData } from "@/admin/api/usage.ts";
import { PaginationAction } from "@/components/ui/pagination.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

function Record() {
  const { t } = useTranslation();
  const [data, setData] = useState<UsageLogData[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);

  // Filters
  const [username, setUsername] = useState<string>("");
  const [type, setType] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  async function update() {
    setLoading(true);
    const resp = await getUsageLogList({
      page,
      username: username || undefined,
      type: type === "all" ? undefined : type,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
    setLoading(false);

    if (resp.status) {
      setData(resp.data);
      setTotal(resp.total);
    } else {
      toast.error(t("admin.error"), {
        description: resp.message,
      });
    }
  }

  useEffectAsync(update, [page]);

  function handleSearch() {
    setPage(0);
    update();
  }

  function getTypeColor(type: string): "default" | "secondary" | "destructive" | "outline" {
    switch (type) {
      case "conversation":
        return "default";
      case "recharge":
      case "payment":
        return "secondary";
      case "subscription":
        return "outline";
      default:
        return "outline";
    }
  }

  function formatValue(log: UsageLogData): string {
    switch (log.type) {
      case "conversation":
        return `${log.quota_cost.toFixed(4)} ${t("record.quota")}${log.is_plan ? ` (${t("record.types.system")})` : ""}`;
      case "recharge":
      case "redeem":
      case "invitation":
        return `+${log.quota_change.toFixed(2)} ${t("record.quota")}`;
      case "payment":
        return log.amount
          ? `${log.amount.toFixed(2)} CNY`
          : "-";
      case "subscription":
        return `${log.amount.toFixed(2)} CNY (Level ${log.subscription_level})`;
      default:
        return "-";
    }
  }

  function formatDetail(log: UsageLogData): string {
    switch (log.type) {
      case "conversation":
        return `${log.model} (${log.input_tokens}→${log.output_tokens} tokens)`;
      case "subscription":
        return log.subscription_months ? `${log.subscription_months} ${t("month")}` : log.detail || "-";
      default:
        return log.detail || "-";
    }
  }

  return (
    <div className={`admin-record`}>
      <Card className={`admin-card record-card`}>
        <CardHeader className={`select-none`}>
          <CardTitle>{t("record.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={t("record.user")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="w-[150px]">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("record.type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("record.types.all")}</SelectItem>
                  <SelectItem value="conversation">{t("record.types.conversation")}</SelectItem>
                  <SelectItem value="recharge">{t("record.types.recharge")}</SelectItem>
                  <SelectItem value="payment">{t("record.types.payment")}</SelectItem>
                  <SelectItem value="subscription">{t("record.types.subscription")}</SelectItem>
                  <SelectItem value="redeem">{t("record.types.redeem")}</SelectItem>
                  <SelectItem value="invitation">{t("record.types.invitation")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Input
                type="date"
                placeholder={t("start_date")}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-[180px]">
              <Input
                type="date"
                placeholder={t("end_date")}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {t("record.query")}
            </Button>
            <Button variant="outline" onClick={update} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Table */}
          {(data && data.length > 0) || page > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className={`select-none whitespace-nowrap`}>
                    <TableHead>{t("record.created-at")}</TableHead>
                    <TableHead>{t("record.user")}</TableHead>
                    <TableHead>{t("record.type")}</TableHead>
                    <TableHead>{t("record.model")}</TableHead>
                    <TableHead>{t("record.quota")}</TableHead>
                    <TableHead>{t("record.detail")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data || []).map((log) => (
                    <TableRow key={log.id} className={`whitespace-nowrap`}>
                      <TableCell>{log.created_at}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.username}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeColor(log.type)}>
                          {t(`record.types.${log.type}`) || log.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.model || "-"}</TableCell>
                      <TableCell>{formatValue(log)}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {formatDetail(log)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationAction
                current={page}
                total={total}
                onPageChange={setPage}
                offset
              />
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <p>{t("admin.empty")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Record;
