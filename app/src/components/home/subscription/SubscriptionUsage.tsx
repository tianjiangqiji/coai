import { ValuableProgress } from "@/components/ui/progress.tsx";

type UsageProps = {
  name: string;
  usage: {
    used: number;
    total: number;
  };
};

function SubscriptionUsage({ name, usage }: UsageProps) {
  if (!usage) return null;

  const isInfinity = usage.total === -1;

  const used = usage.used;
  const total = isInfinity ? "∞" : usage.total;

  return (
    <div className={`sub-column-wrapper inline-flex flex-col`}>
      <div className={`sub-column`}>
        <div className={`flex items-center text-sm text-secondary`}>{name}</div>
        <div className={`grow`} />
        <div className={`sub-value font-medium text-md`}>
          {isInfinity ? (
            <p>{used}</p>
          ) : (
            <>
              <p>{used}</p>
              <p className="text-secondary !font-normal text-sm">/{total}</p>
            </>
          )}
        </div>
      </div>
      <ValuableProgress
        className={`w-full h-2`}
        value={usage.used}
        max={usage.total}
      />
    </div>
  );
}

export default SubscriptionUsage;
