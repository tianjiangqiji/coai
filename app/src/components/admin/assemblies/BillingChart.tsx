import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { AreaChart } from "@tremor/react";
import { useCurrency } from "@/store/info";

type BillingChartProps = {
  labels: string[];
  datasets: number[];
};
function BillingChart({ labels, datasets }: BillingChartProps) {
  const { t } = useTranslation();
  const { symbol } = useCurrency();

  const data = useMemo(() => {
    return datasets.map((data, index) => ({
      date: labels[index],
      [t("admin.billing")]: data,
    }));
  }, [labels, datasets, t("admin.billing")]);

  const mrr = useMemo(() => {
    // datasets sum
    return datasets.reduce((acc, curr) => acc + curr, 0);
  }, [datasets]);

  return (
    <div className={`chart`}>
      <div className={`chart-title mb-2`}>
        <p>{t("admin.billing-chart")}</p>
        {labels.length === 0 && (
          <Loader2 className={`h-4 w-4 inline-block animate-spin`} />
        )}

        <div
          className={`ml-auto bg-orange-500/20 text-orange-500 px-1 rounded-sm text-xs py-0.5`}
        >
          MRR {symbol}
          {mrr.toFixed(2)}
        </div>
      </div>
      <AreaChart
        className={`common-chart`}
        data={data}
        categories={[t("admin.billing")]}
        index={"date"}
        colors={["orange"]}
        showAnimation={true}
        valueFormatter={(value) => `${symbol}${value.toFixed(2)}`}
      />
    </div>
  );
}

export default BillingChart;
