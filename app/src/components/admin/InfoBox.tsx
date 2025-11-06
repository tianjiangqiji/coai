import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  CircleDollarSign,
  MessageSquareDot,
  Users2,
  Wallet,
} from "lucide-react";
import { useEffectAsync } from "@/utils/hook.ts";
import { getAdminInfo, initialAdminInfoState } from "@/admin/api/chart.ts";
import { InfoResponse } from "@/admin/types.ts";
import { getReadableNumber } from "@/utils/processor.ts";
import { TrendBadge } from "@/components/TrendBadge.tsx";
import { useCurrency } from "@/store/info";

function InfoBox() {
  const { t } = useTranslation();
  const { name: currencyName } = useCurrency();
  const [form, setForm] = useState<InfoResponse>({
    ...initialAdminInfoState,
  });

  useEffectAsync(async () => {
    setForm(await getAdminInfo());
  }, []);

  return (
    <div className={`info-boxes`}>
      <div className={`info-box`}>
        <div className={`box-wrapper`}>
          <div className={`box-title`}>{t("admin.billing-today")}</div>
          <div className={`flex flex-col md:flex-row md:items-end`}>
            <div className={`box-value`}>
              {form.billing_today.toFixed(2)}
              <span className={`box-subvalue`}>{currencyName}</span>
            </div>
            <TrendBadge
              current={form.billing_today}
              previous={form.billing_yesterday}
            />
          </div>
        </div>
        <div className={`box-icon`}>
          <CircleDollarSign />
        </div>
      </div>

      <div className={`info-box`}>
        <div className={`box-wrapper`}>
          <div className={`box-title`}>{t("admin.billing-month")}</div>
          <div className={`flex flex-col md:flex-row md:items-end`}>
            <div className={`box-value mr-1`}>
              {form.billing_month.toFixed(2)}
              <span className={`box-subvalue`}>{currencyName}</span>
            </div>
            <TrendBadge
              current={form.billing_month}
              previous={form.billing_last_month}
            />
          </div>
        </div>
        <div className={`box-icon`}>
          <Wallet />
        </div>
      </div>

      <div className={`info-box`}>
        <div className={`box-wrapper`}>
          <div className={`box-title`}>{t("admin.subscription-users")}</div>
          <div className={`box-value`}>
            {form.subscription_count}
            <span className={`box-subvalue`}>{t("admin.seat")}</span>
          </div>
        </div>
        <div className={`box-icon`}>
          <Users2 />
        </div>
      </div>

      <div className={`info-box`}>
        <div className={`box-wrapper`}>
          <div className={`box-title`}>{t("admin.online-chats")}</div>
          <div className={`box-value`}>
            {getReadableNumber(form.online_chats)}
          </div>
        </div>
        <div className={`box-icon`}>
          <MessageSquareDot />
        </div>
      </div>
    </div>
  );
}

export default InfoBox;
