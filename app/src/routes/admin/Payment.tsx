import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useTranslation } from "react-i18next";
import { useReducer, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { RotateCw, Save } from "lucide-react";
import { useEffectAsync } from "@/utils/hook.ts";
import {
  getConfig,
  initialSystemState,
  setConfig,
  SystemProps,
} from "@/admin/api/system.ts";
import { formReducer } from "@/utils/form.ts";
import { withNotify } from "@/api/common.ts";
import { Input } from "@/components/ui/input.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { NumberInput } from "@/components/ui/number-input.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { cn } from "@/components/ui/lib/utils.ts";

const PAYMENT_METHOD_OPTIONS = ["alipay", "wxpay"];

function Payment() {
  const { t } = useTranslation();
  const [data, setData] = useReducer(
    formReducer<SystemProps>(),
    initialSystemState,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const loadConfig = async (toastSuccess = false) => {
    setLoading(true);
    const res = await getConfig();
    setLoading(false);
    withNotify(t, res, toastSuccess);
    if (res.status && res.data) {
      setData({ type: "set", value: res.data });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await setConfig(data);
    setSaving(false);
    withNotify(t, res, true);
    if (res.status) {
      await loadConfig();
    }
  };

  useEffectAsync(async () => {
    await loadConfig();
  }, []);

  const epay = data.payment.epay;
  const methods = epay.methods || [];
  const methodsDisabled = !epay.enabled || epay.aggregation;

  const updateField = (path: string, value: any) =>
    setData({ type: `update:${path}`, value });

  const handleMethodChange = (method: string, checked: boolean) => {
    const values = new Set(methods);
    if (checked) values.add(method);
    else values.delete(method);
    updateField("payment.epay.methods", Array.from(values));
  };

  const disabledInputs = !epay.enabled;

  return (
    <div className={`payment`}>
      <Card className={`admin-card payment-card`}>
        <CardHeader className={`select-none`}>
          <div className="flex items-center justify-between">
            <CardTitle>{t("admin.payment")}</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size={`icon`}
                variant={`outline`}
                loading={loading}
                className={`mr-1`}
                onClick={async () => await loadConfig(true)}
                disabled={loading}
              >
                <RotateCw
                  className={cn(loading && `animate-spin`, `h-4 w-4`)}
                />
              </Button>
              <Button
                size={`icon`}
                loading={saving}
                onClick={handleSave}
                disabled={saving}
              >
                <Save className={`h-4 w-4`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={`space-y-6`}>
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-base font-medium">
                  {t("admin.system.epayTitle")}
                </Label>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {t("admin.system.epayTip")}
                </p>
              </div>
              <Switch
                checked={epay.enabled}
                onCheckedChange={(value) =>
                  updateField("payment.epay.enabled", value)
                }
              />
            </div>
          </div>

          <div className="payment-grid">
            <div className="space-y-2">
              <Label>{t("admin.system.epayDomain")}</Label>
              <Input
                placeholder={t("admin.system.epayDomainPlaceholder") || ""}
                value={epay.domain}
                disabled={disabledInputs}
                onChange={(e) =>
                  updateField("payment.epay.domain", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.system.epayCallback")}</Label>
              <Input
                placeholder={t("admin.system.epayCallbackPlaceholder") || ""}
                value={epay.callbackurl}
                disabled={disabledInputs}
                onChange={(e) =>
                  updateField("payment.epay.callbackurl", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.system.epayBusinessId")}</Label>
              <Input
                placeholder={t("admin.system.epayBusinessIdPlaceholder") || ""}
                value={epay.businessid}
                disabled={disabledInputs}
                onChange={(e) =>
                  updateField("payment.epay.businessid", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.system.epayBusinessKey")}</Label>
              <Input
                type="password"
                placeholder={t("admin.system.epayBusinessKeyPlaceholder") || ""}
                value={epay.businesskey}
                disabled={disabledInputs}
                onChange={(e) =>
                  updateField("payment.epay.businesskey", e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.system.epayMinAmount")}</Label>
              <NumberInput
                value={epay.minamount}
                min={0.1}
                step={0.1}
                disabled={disabledInputs}
                onValueChange={(value) =>
                  updateField(
                    "payment.epay.minamount",
                    Math.max(0.1, Math.round(value * 100) / 100),
                  )
                }
                placeholder="1"
              />
              <p className="text-xs text-muted-foreground">
                {t("admin.system.epayMinAmountHelp")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t("admin.system.epayAggregation")}</Label>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <p className="text-sm text-muted-foreground mr-4">
                  {t("admin.system.epayAggregationTip")}
                </p>
                <Switch
                  checked={epay.aggregation}
                  onCheckedChange={(value) =>
                    updateField("payment.epay.aggregation", value)
                  }
                  disabled={disabledInputs}
                />
              </div>
            </div>
          </div>

          {!methodsDisabled && (
            <div className="space-y-2 rounded-lg border p-4">
              <div>
                <Label>{t("admin.system.epayMethods")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("admin.system.epayMethodsPlaceholder", {
                    length: methods.length,
                  })}
                </p>
              </div>
              <div className="payment-methods">
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <label
                    key={method}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={methods.includes(method)}
                      onCheckedChange={(checked) =>
                        handleMethodChange(method, checked === true)
                      }
                      disabled={methodsDisabled}
                    />
                    <span className="text-sm">
                      {t(`payment.${method}`) || method}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Payment;
