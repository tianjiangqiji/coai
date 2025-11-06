import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { quotaSelector, refreshQuota } from "@/store/quota.ts";
import { AppDispatch } from "@/store";
import { Cloud, ExternalLink, Gift, CreditCard, Loader2 } from "lucide-react";
import { docsEndpoint } from "@/conf/env.ts";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useRedeem as redeemCode } from "@/api/redeem.ts";
import { motion } from "framer-motion";
import { NumberInput } from "@/components/ui/number-input.tsx";
import {
  createEpayOrder,
  getEpayInfo,
  getEpayOrderStatus,
} from "@/api/payment.ts";
import type { EpayInfoResponse } from "@/api/payment.ts";
import { getDeviceType } from "@/payment/utils.ts";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { useLocation } from "react-router-dom";
import { Label } from "@/components/ui/label.tsx";

export default function WalletQuotaBox() {
  const { t } = useTranslation();
  const quota = useSelector(quotaSelector);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const location = useLocation();
  const dispatch: AppDispatch = useDispatch();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.1,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  useEffect(() => {
    const hash = location.hash || window.location.hash;
    let query = "";
    if (hash && hash.includes("?")) {
      query = hash.split("?")[1] ?? "";
    } else if (location.search) {
      query = location.search.slice(1);
    }

    if (!query) return;

    const params = new URLSearchParams(query);
    if (params.get("pay") !== "epay") return;

    const cleanHash = hash && hash.includes("?") ? hash.split("?")[0] : hash;
    const cleanUrl = `${window.location.pathname}${location.search}${cleanHash ?? ""}`;
    window.history.replaceState(null, "", cleanUrl);

    const orderNo = params.get("out_trade_no") ?? "";
    const tradeStatus = params.get("trade_status") ?? "";

    (async () => {
      if (orderNo) {
        const res = await getEpayOrderStatus(orderNo);
        if (res.status) {
          if ((res.order_status || "").toLowerCase() === "paid") {
            toast.success(t("buy.recharge-success"));
            dispatch(refreshQuota());
          } else {
            toast.info(t("buy.recharge-pending"));
          }
        } else {
          toast.error(t("buy.recharge-failed"), {
            description: res.error || t("buy.recharge-error-generic"),
          });
        }
      } else if (tradeStatus.toUpperCase() === "TRADE_SUCCESS") {
        toast.success(t("buy.recharge-success"));
        dispatch(refreshQuota());
      } else {
        toast.info(t("buy.recharge-pending"));
      }
    })();
  }, [location, dispatch, t]);

  return (
    <motion.div
      className={`w-full h-fit md:mt-4`}
      id={`quota`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <RechargeComponent open={rechargeOpen} onOpenChanged={setRechargeOpen} />
      <RedeemComponent open={redeemOpen} onOpenChanged={setRedeemOpen} />
      <motion.div className={`flex flex-col pb-4`} variants={itemVariants}>
        <motion.div className={`dialog-wrapper`} variants={itemVariants}>
          <motion.div className={`buy-interface`} variants={itemVariants}>
            <motion.div
              className={`w-full h-fit mt-0 border rounded-lg p-2.5 bg-background flex flex-col md:flex-row`}
              variants={itemVariants}
            >
              <motion.div
                className="flex flex-col w-full md:w-1/2 p-2.5 pb-4 md:pb-2.5 border-b md:border-r md:border-b-0"
                variants={itemVariants}
              >
                <motion.div
                  className="text-xs text-secondary mb-1"
                  variants={itemVariants}
                >
                  {t("buy.title")}
                </motion.div>
                <motion.div
                  className="text-2xl font-medium mb-1 jetbrains-mono"
                  variants={itemVariants}
                >
                  <Cloud className={`h-4 w-4 mr-1 inline-block`} />
                  {quota.toFixed(2)}
                </motion.div>
                <motion.div
                  className={`text-xs text-secondary mt-auto break-all whitespace-pre-wrap`}
                  variants={itemVariants}
                >
                  {t("buy.quota-info")}
                  <a
                    href={docsEndpoint}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sky-500 hover:text-sky-600"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-0.5 ml-1 inline-block" />
                    {t("buy.learn-more")}
                  </a>
                </motion.div>
              </motion.div>

              <motion.div
                className="flex flex-col w-full md:w-1/2 pt-4 md:pt-0 md:pl-2"
                variants={itemVariants}
              >
                <motion.div
                  className={`flex flex-col items-center justify-center h-full`}
                  variants={itemVariants}
                >
                  <motion.div
                    className="flex flex-col space-y-2 w-full px-1"
                    variants={itemVariants}
                  >
                    <div className="grid w-full grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="w-full transition-all hover:bg-secondary"
                        onClick={() => setRechargeOpen(true)}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {t("buy.recharge-title")}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full transition-all hover:bg-secondary"
                        onClick={() => setRedeemOpen(true)}
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        {t("buy.redeem-title")}
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

type RedeemComponentProps = {
  open: boolean;
  onOpenChanged: (open: boolean) => void;
};

function RedeemComponent({ open, onOpenChanged }: RedeemComponentProps) {
  const { t } = useTranslation();
  const [redeem, setRedeem] = useState("");
  const dispatch: AppDispatch = useDispatch();

  const doRedeemAction = async () => {
    if (redeem.trim() === "") return;
    const res = await redeemCode(redeem.trim());
    if (res.status) {
      toast.success(t("buy.exchange-success"), {
        description: t("buy.exchange-success-prompt", {
          amount: res.quota,
        }),
      });
      setRedeem("");
      dispatch(refreshQuota());
      onOpenChanged(false);
    } else {
      toast.error(t("buy.exchange-failed"), {
        description: t("buy.exchange-failed-prompt", {
          reason: res.error,
        }),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChanged}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("buy.redeem-title")}</DialogTitle>
          <DialogDescription>{t("buy.redeem-description")}</DialogDescription>
        </DialogHeader>
        <div className={`w-full h-fit relative`}>
          <Gift
            className={`h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2`}
          />
          <Input
            className={`redeem-input flex-grow text-center pl-10`}
            placeholder={t("buy.redeem-placeholder")}
            value={redeem}
            onChange={(e) => setRedeem(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            unClickable
            onClick={() => onOpenChanged(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            unClickable
            disabled={redeem.trim() === ""}
            loading={true}
            onClick={doRedeemAction}
          >
            {t("buy.redeem")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type RechargeComponentProps = {
  open: boolean;
  onOpenChanged: (open: boolean) => void;
};

function RechargeComponent({ open, onOpenChanged }: RechargeComponentProps) {
  const { t } = useTranslation();
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState<string>("");
  const [info, setInfo] = useState<EpayInfoResponse | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [method, setMethod] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const minAmount = info?.minamount && info.minamount > 0 ? info.minamount : 1;
  const aggregation = !!info?.aggregation;
  const enabled = !!info?.enabled;

  useEffect(() => {
    if (!open) return;
    (async () => {
      setInfoLoading(true);
      const res = await getEpayInfo();
      setInfoLoading(false);
      if (res.status) {
        setInfo(res);
        setAmount(res.minamount && res.minamount > 0 ? res.minamount : 1);
        setMethod(
          !res.aggregation && res.methods && res.methods.length > 0
            ? res.methods[0]
            : "",
        );
        setInfoError("");
      } else {
        setInfo(null);
        setInfoError(res.error || t("buy.recharge-info-failed"));
      }
    })();
  }, [open, t]);

  const handleRecharge = async () => {
    const payAmount = Math.round(amount * 100) / 100;
    if (!enabled) {
      toast.error(t("buy.recharge-disabled"));
      return;
    }
    if (payAmount < minAmount) {
      toast.error(
        t("buy.recharge-too-low", {
          amount: minAmount.toFixed(2),
        }),
      );
      return;
    }

    if (!aggregation && info?.methods && info.methods.length > 0 && !method) {
      toast.error(t("buy.recharge-method-required"));
      return;
    }

    setSubmitting(true);
    const res = await createEpayOrder({
      amount: payAmount,
      method: aggregation ? undefined : method,
      return_url: `${window.location.origin}/#/wallet?pay=epay`,
      device: getDeviceType(),
    });
    setSubmitting(false);

    if (res.status && res.pay_url) {
      toast.info(t("buy.recharge-processing"));
      onOpenChanged(false);
      window.location.href = res.pay_url;
    } else {
      toast.error(t("buy.recharge-failed"), {
        description: res.error || t("buy.recharge-error-generic"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChanged}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("buy.recharge-title")}</DialogTitle>
          <DialogDescription>
            <p className="text-sm text-muted-foreground">
              {t("buy.recharge-rate", { ratio: 10 })}
            </p>
          </DialogDescription>
        </DialogHeader>

        {infoLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : infoError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {infoError}
          </div>
        ) : (
          <div className="space-y-4">
            {!enabled && (
              <div className="rounded-md border border-amber-400/40 bg-amber-50/80 p-3 text-sm text-amber-700">
                {t("buy.recharge-disabled")}
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("buy.recharge-amount")}</Label>
              <NumberInput
                value={amount}
                min={minAmount}
                acceptNegative={false}
                onValueChange={setAmount}
                disabled={!enabled}
              />
              <p className="text-xs text-muted-foreground">
                {t("buy.recharge-min-tip", {
                  amount: minAmount.toFixed(2),
                })}
              </p>
            </div>

            {!aggregation && info?.methods && info.methods.length > 0 && (
              <div className="space-y-2">
                <Label>{t("buy.recharge-method")}</Label>
                <RadioGroup
                  value={method}
                  onValueChange={setMethod}
                  className="space-y-1"
                >
                  {info.methods.map((item) => (
                    <div className="flex items-center gap-2" key={item}>
                      <RadioGroupItem value={item} id={`method-${item}`} />
                      <Label
                        htmlFor={`method-${item}`}
                        className="text-sm font-normal"
                      >
                        {t(`payment.${item}`) || item}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            unClickable
            onClick={() => onOpenChanged(false)}
            disabled={submitting}
          >
            {t("cancel")}
          </Button>
          <Button
            unClickable
            loading={submitting}
            disabled={!enabled || infoLoading || submitting}
            onClick={handleRecharge}
          >
            {t("buy.recharge-pay")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
