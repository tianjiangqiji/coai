import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type TrendBadgeProps = {
  current: number;
  previous: number;
};

export const TrendBadge: React.FC<TrendBadgeProps> = ({
  current,
  previous,
}) => {
  const trend = previous === 0 ? 0 : ((current - previous) / previous) * 100;
  const percentage = Math.abs(trend).toFixed(1);

  return trend < 0 ? (
    <span className="inline-flex items-center gap-x-1 rounded-tremor-small px-2 py-1 text-tremor-label font-semibold text-red-700 ring-1 ring-inset ring-tremor-ring dark:text-red-500 dark:ring-dark-tremor-ring">
      <ChevronDown className="-ml-0.5 h-4 w-4" aria-hidden={true} />
      {percentage}%
    </span>
  ) : (
    <span className="inline-flex items-center gap-x-1 rounded-tremor-small px-2 py-1 text-tremor-label font-semibold text-green-700 ring-1 ring-inset ring-tremor-ring dark:text-green-500 dark:ring-dark-tremor-ring">
      <ChevronUp className="-ml-0.5 h-4 w-4" aria-hidden={true} />
      {percentage}%
    </span>
  );
};
