import React from "react";
import { cn } from "@/components/ui/lib/utils.ts";
import { motion } from "framer-motion";

export type StepProps = {
  step: number;
  label?: string;
  children?: React.ReactNode;
  className?: string;
};

function Step({ step, label, children, className, ...props }: StepProps) {
  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className={cn(
        `step step-${step} group flex flex-row items-center cursor-pointer text-center`,
        className,
      )}
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3, delay: step * 0.2 }}
      {...props}
    >
      <motion.div
        className={cn(
          "step-number h-6 w-6 flex items-center justify-center shrink-0",
          "bg-primary text-background rounded-full",
          "text-sm font-bold border shadow mr-1.5",
          "cursor-pointer select-none",
          "transition duration-300 ease-in-out",
          "group-hover:bg-background group-hover:text-primary",
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {step}
      </motion.div>
      <motion.div
        className={"step-label text-primary text-sm"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: step * 0.2 + 0.2 }}
      >
        {label}
      </motion.div>
      {children}
    </motion.div>
  );
}

export default Step;
