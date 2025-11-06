import React, { useEffect, useMemo } from "react";
import { buySubscription } from "@/api/addition.ts";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { DialogClose } from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button.tsx";
import { expiredSelector, refreshSubscription } from "@/store/subscription.ts";
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Info,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { deeptrainEndpoint, useDeeptrain } from "@/conf/env.ts";
import { quotaSelector } from "@/store/quota.ts";
import { getPlanName, getPlanPrice } from "@/conf/subscription.tsx";
import { Plans } from "@/api/types.tsx";
import { subscriptionDataSelector } from "@/store/globals.ts";
import { openWindow } from "@/utils/device.ts";
import { AppDispatch } from "@/store";
import { toast } from "sonner";
import Icon from "@/components/utils/Icon";
import { useCurrency } from "@/store/info";
import Tips from "@/components/Tips";

function countPrice(data: Plans, base: number, month: number): number {
  const price = getPlanPrice(data, base) * month;
  
  const plan = data.find(p => p.level === base);
  if (plan && plan.discounts) {
    const discount = plan.discounts[month.toString()];
    if (discount !== undefined) {
      return price * discount;
    }
  }
  
  if (month >= 36) {
    return price * 0.7;
  } else if (month >= 12) {
    return price * 0.8;
  } else if (month >= 6) {
    return price * 0.9;
  }

  return price;
}

function countUpgradePrice(
  data: Plans,
  level: number,
  target: number,
  days: number,
): number {
  const bias = getPlanPrice(data, target) - getPlanPrice(data, level);
  const v = (bias / 30) * days;
  return (v > 0 ? v + 1 : 0) + 1; // time count offset
}

function getDiscountPercent(data: Plans, base: number, month: number): number | null {
  const plan = data.find(p => p.level === base);
  if (plan && plan.discounts) {
    const discount = plan.discounts[month.toString()];
    if (discount !== undefined) {
      return Math.round((1 - discount) * 100);
    }
  }

  if (month >= 36) {
    return 30;
  } else if (month >= 12) {
    return 20;
  } else if (month >= 6) {
    return 10;
  }

  return null;
}

type UpgradeProps = {
  level: number;
  current: number;
  isYearly?: boolean;
};

async function callBuyAction(
  t: any,
  month: number,
  level: number,
  current: number,
): Promise<boolean> {
  const res = await buySubscription(month, level);
  if (res.status) {
    toast.success(t("sub.success"), {
      description: t("sub.success-prompt", {
        month,
      }),
    });
  } else {
    toast.error(t("sub.failed"), {
      description: useDeeptrain
        ? t("sub.failed-prompt")
        : t("sub.failed-quota-prompt", {
            quota: current.toFixed(2),
          }),

      action: useDeeptrain
        ? {
            label: t("buy.go"),
            onClick: () => {
              openWindow(`${deeptrainEndpoint}/home/wallet`);
            },
          }
        : undefined,
    });

    useDeeptrain &&
      setTimeout(() => {
        openWindow(`${deeptrainEndpoint}/home/wallet`);
      }, 2000);
  }
  return res.status;
}

async function callMigrateAction(t: any, level: number): Promise<boolean> {
  const res = await buySubscription(1, level);
  if (res.status) {
    toast.success(t("sub.migrate-success"), {
      description: t("sub.migrate-success-prompt"),
    });
  } else {
    toast.error(t("sub.migrate-failed"), {
      description: t("sub.sub-migrate-failed-prompt", { reason: res.error }),
    });
  }
  return res.status;
}

export function Upgrade({ level, current, isYearly }: UpgradeProps) {
  const { t } = useTranslation();
  const expired = useSelector(expiredSelector);
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(1);
  const dispatch: AppDispatch = useDispatch();

  const quota = useSelector(quotaSelector);

  const subscriptionData = useSelector(subscriptionDataSelector);

  const isCurrent = useMemo(() => current === level, [current, level]);
  const isUpgrade = useMemo(() => current < level, [current, level]);

  const { symbol } = useCurrency();

  useEffect(() => {
    if (isYearly) {
      setMonth(12);
    } else {
      setMonth(1);
    }
  }, [isYearly]);

  return current === 0 || current === level ? (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          tapScale={0.975}
          classNameWrapper="w-full"
          className={`action w-full`}
          variant={`default`}
        >
          <Icon icon={<ShoppingCart />} className="h-4 w-4 mr-1.5" />
          {isCurrent ? t("sub.renew") : t("sub.subscribe")}
        </Button>
      </DialogTrigger>
      <DialogContent className={`flex-dialog`}>
        <DialogHeader>
          <DialogTitle>{t("sub.select-time")}</DialogTitle>
        </DialogHeader>
        <div className="upgrade-wrapper grid md:grid-cols-2 gap-4 w-full">
          {[1, 3, 6, 12].map((duration) => (
            <button
              key={duration}
              className={`w-full p-4 rounded-lg border ${
                month === duration
                  ? "border-primary bg-muted/20"
                  : "border hover:border-primary/50"
              } transition-all duration-200 ease-in-out flex justify-between items-center`}
              onClick={() => setMonth(duration)}
            >
              <div className="flex flex-col items-start">
                <span className="font-semibold">
                  {t(`sub.time.${duration}`)}
                </span>
                <div>
                  <span className="text-sm">{symbol}</span>
                  <span className="text-sm font-bold">
                    {countPrice(subscriptionData, level, duration).toFixed(2)}
                  </span>
                </div>
              </div>
              {(() => {
                const discount = getDiscountPercent(subscriptionData, level, duration);
                return discount ? (
                  <div className="ml-2 text-xs text-secondary !text-[#55b467] !bg-[#f4fdeb] !border !border-[#55b467]/20 px-1.5 py-0.5 rounded-full">
                    {discount}%
                  </div>
                ) : null;
              })()}
            </button>
          ))}
        </div>
        <DialogFooter className={`translate-y-1.5`}>
          <DialogClose asChild>
            <Button unClickable variant={`outline`}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            unClickable
            loading
            className={`mb-1.5`}
            onClick={async () => {
              const res = await callBuyAction(t, month, level, quota);
              if (res) {
                setOpen(false);
                dispatch(refreshSubscription());
              }
            }}
          >
            <Plus className={`h-4 w-4 mr-1`} />
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={`action w-full`}
          variant={isUpgrade ? `default` : `outline`}
          tapScale={0.975}
          classNameWrapper="w-full"
        >
          <Icon
            icon={isUpgrade ? <ArrowUpCircle /> : <ArrowDownCircle />}
            className="h-4 w-4 mr-1.5"
          />
          {isUpgrade ? t("sub.upgrade") : t("sub.downgrade")}
        </Button>
      </DialogTrigger>
      <DialogContent className={`flex-dialog`}>
        <DialogHeader>
          <DialogTitle>{t("sub.migrate-plan")}</DialogTitle>
        </DialogHeader>
        <div
          className={`upgrade-wrapper text-md p-2 border rounded-lg bg-secondary/50 !mt-0.5`}
        >
          <Info className="h-4 w-4 mr-1 inline-block" />
          {t("sub.migrate-plan-desc")}
        </div>
        <div className="flex items-center justify-between space-x-2 mt-3">
          <div className="flex-1 p-3 border rounded-md bg-background">
            <h3 className="text-base font-medium">{t("sub.current")}</h3>
            <p className="text-xs text-muted-foreground">
              {t(`sub.${getPlanName(current)}`)}
            </p>
            <p className="text-lg font-medium">
              {symbol}
              {getPlanPrice(subscriptionData, current).toFixed(2)}/
              {t("sub.month")}
            </p>
          </div>

          <ArrowRight className="h-5 w-5 text-muted-foreground" />

          <div className="flex-1 p-3 border rounded-md bg-background">
            <h3 className="text-base font-medium">{t("sub.new")}</h3>
            <p className="text-xs text-muted-foreground">
              {t(`sub.${getPlanName(level)}`)}
            </p>
            <p className="text-lg font-medium">
              {symbol}
              {getPlanPrice(subscriptionData, level).toFixed(2)}/
              {t("sub.month")}
            </p>
          </div>
        </div>

        {isUpgrade && (
          <div className="flex items-center justify-center flex-col p-3 bg-secondary/20 rounded-md mt-2">
            <span className="mb-0.5 flex items-center">
              {t("sub.upgrade-price-label")}
              <Tips content={t("sub.upgrade-price-notice-tip")} />
            </span>
            <div className="flex items-center px-1.5 py-0.5 rounded-lg text-amber-500 bg-amber-400/10 border border-amber-400/30">
              <span className="text-sm font-medium">{symbol}</span>
              <span className="text-md font-medium">
                {countUpgradePrice(
                  subscriptionData,
                  current,
                  level,
                  expired,
                ).toFixed(2)}
              </span>
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button unClickable variant={`outline`}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            unClickable
            loading
            className={`mb-1.5`}
            onClick={async () => {
              const res = await callMigrateAction(t, level);
              if (res) {
                setOpen(false);
                dispatch(refreshSubscription());
              }
            }}
          >
            <Plus className={`h-4 w-4 mr-1`} />
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
