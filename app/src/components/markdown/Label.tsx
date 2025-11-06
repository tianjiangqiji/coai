import {
  CalendarPlus,
  Cloud,
  CloudCog,
  Cloudy,
  Package,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import React from "react";
import { useSelector } from "react-redux";
import { subscriptionDataSelector } from "@/store/globals.ts";
import { useTranslation } from "react-i18next";
import router from "@/router.tsx";
import Emoji from "../Emoji";
import { cn } from "../ui/lib/utils";
import ModelAvatar from "../ModelAvatar";
import { selectSupportModels } from "@/store/chat";

type QuotaExceededFormProps = {
  model: string;
  minimum: string;
  quota: string;
  plan: boolean;
};

function QuotaExceededForm({
  model,
  minimum,
  quota,
  plan,
}: QuotaExceededFormProps) {
  const { t } = useTranslation();
  const supportModels = useSelector(selectSupportModels);
  const modelInfo = supportModels.find((m) => m.id === model);

  return (
    <div className={`flex flex-col items-center pt-4 pb-1`}>
      <Emoji emoji={"1f915"} className={`w-16 h-16 m-6 mb-4`} />
      <p className={`text-lg font-semibold !mb-1`}>
        {t("oops-quota-exceeded")}
      </p>
      <p className={`text-sm text-secondary px-2.5 text-center`}>
        {t("oops-quota-exceeded-tip")}
      </p>
      <div className="w-full h-fit border bg-muted/50 rounded-lg p-1.5 flex flex-col space-y-2.5 py-2.5">
        <div
          className={`flex flex-row w-full items-center justify-center px-4`}
        >
          <Package className={`h-4 w-4 mr-1`} />
          {t("model")}
          <div className={`grow`} />
          <div className={`!mb-0 flex flex-row items-center space-x-1`}>
            <ModelAvatar
              size={24}
              model={
                modelInfo ?? {
                  id: model,
                  name: model,
                }
              }
            />
            <p className={`!mb-0`}>{modelInfo?.name ?? model}</p>
          </div>
        </div>
        <div
          className={`flex flex-row w-full items-center justify-center px-4`}
        >
          <Cloudy className={`h-4 w-4 mr-1`} />
          {t("your-quota")}
          <div className={`grow`} />
          <p className={`flex flex-row items-center font-medium !mb-0`}>
            {quota}
            <Cloud className={`h-4 w-4 ml-1`} />
          </p>
        </div>
        <div
          className={`flex flex-row w-full items-center justify-center px-4`}
        >
          <CloudCog className={`h-4 w-4 mr-1`} />
          {t("min-quota")}
          <div className={`grow`} />
          <p className={`flex flex-row items-center font-medium !mb-0`}>
            {minimum}
            <Cloud className={`h-4 w-4 ml-1`} />
          </p>
        </div>
      </div>

      <div
        className={cn(
          `mt-4 w-full h-fit grid grid-cols-1 gap-2`,
          plan && "md:grid-cols-2",
        )}
      >
        <Button
          classNameWrapper={`w-full`}
          className={`w-full`}
          onClick={() => router.navigate("/wallet")}
        >
          <Plus className={`h-4 w-4 mr-1`} />
          {t("buy.dialog-title")}
        </Button>
        {plan && (
          <Button
            variant={`outline`}
            classNameWrapper={`w-full`}
            className={`w-full`}
            onClick={() => router.navigate("/wallet#plan")}
          >
            <CalendarPlus className={`h-4 w-4 mr-1`} />
            {t("sub.dialog-title")}
          </Button>
        )}
      </div>
    </div>
  );
}

type LabelProps = {
  children: React.ReactNode;
};

export default function ({ children }: LabelProps) {
  const subscription = useSelector(subscriptionDataSelector);
  const content = (children ?? "").toString();

  if (content.startsWith("user quota")) {
    // if the format is `user quota is not enough error (model: gpt-3.5-turbo-1106, minimum quota: 0.01, your quota: -77.77)`, return special component

    const match = content.match(
      /user quota is not enough error \(model: (.*), minimum quota: (.*), your quota: (.*)\)/,
    );
    if (match) {
      const [, model, minimum, quota] = match;
      const plan = subscription
        .flatMap((p) => p.items.map((i) => i.models.includes(model)))
        .includes(true);

      return (
        <QuotaExceededForm
          model={model}
          minimum={minimum}
          quota={quota}
          plan={plan}
        />
      );
    }
  }

  return <p>{children}</p>;
}
