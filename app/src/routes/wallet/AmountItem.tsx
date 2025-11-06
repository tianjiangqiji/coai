import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import Clickable from "@/components/ui/clickable.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import { Cloud, Check } from "lucide-react";
import { Input } from "@/components/ui/input.tsx";
import { useCurrency } from "@/store/info";

type AmountComponentProps = {
  amount: number;
  active?: boolean;
  other?: boolean;
  onClick?: () => void;
  onAmountChange?: (amount: number) => void;
};

function QuotaItem({ amount, active, other, onClick }: AmountComponentProps) {
  const { t } = useTranslation();
  const { symbol } = useCurrency();
  const ref = useRef<HTMLInputElement>(null);

  const onClickEvent = () => {
    onClick?.();
    ref.current?.focus();
  };

  return (
    <Clickable
      className={cn(
        "amount bg-input/10 dark:bg-input/20 shadow-sm h-full",
        active && "active",
      )}
      onClick={onClickEvent}
      tapScale={0.975}
    >
      {active && (
        <Check
          className={`h-5 w-5 p-1 bg-primary/5 dark:bg-primary/10 rounded-full absolute top-2 right-2 text-primary`}
        />
      )}
      {!other ? (
        <>
          <div className={`amount-title`}>
            {(amount * 10).toFixed(0)}
            <Cloud className={`h-4 w-4`} />
          </div>
          <div className={`amount-desc text-xs`}>
            <span className="text-2xs">{symbol}</span>
            {amount.toFixed(2)}
          </div>
        </>
      ) : (
        <>
          <div className={`other my-auto`}>{t("buy.other")}</div>
        </>
      )}
    </Clickable>
  );
}

type QuotaWrapperProps = {
  current: number;
  onCurrentChange: (index: number) => void;
  amount: number;
  onAmountChange: (amount: number) => void;
  builtinAmount: number[];
};

export default function QuotaWrapper({
  current,
  onCurrentChange,
  onAmountChange,
  builtinAmount,
}: QuotaWrapperProps) {
  const customIndex = builtinAmount.length;
  const [customAmount, setCustomAmount] = useState("");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim() || "0";
    // Remove leading zeros
    if (value.startsWith("0") && value.length > 1) {
      value = value.replace(/^0+/, "");
    }
    if (/^\d+$/.test(value)) {
      setCustomAmount(value);
      onAmountChange(Number(value));
    }
  };

  return (
    <motion.div
      className={`amount-container`}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className={`amount-wrapper`}>
        <AnimatePresence>
          {builtinAmount.map((amount, index) => (
            <motion.div key={index} variants={itemVariants}>
              <QuotaItem
                amount={amount}
                active={current === index}
                onClick={() => {
                  onCurrentChange(index);
                  onAmountChange(amount * 10);
                }}
              />
            </motion.div>
          ))}
          <motion.div variants={itemVariants}>
            <QuotaItem
              amount={NaN}
              other={true}
              active={current === customIndex}
              onClick={() => onCurrentChange(customIndex)}
              onAmountChange={onAmountChange}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      {current === customIndex && (
        <div className="mt-0.5 relative w-full">
          <Input
            type="number"
            className="w-full pl-10 text-center"
            value={customAmount}
            onChange={handleCustomAmountChange}
            maxLength={8}
          />
          <Cloud
            className={`h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2`}
          />
        </div>
      )}
    </motion.div>
  );
}
