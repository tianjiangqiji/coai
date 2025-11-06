import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Button, type ButtonProps } from "@/components/ui/button.tsx";
import { cn } from "@/components/ui/lib/utils.ts";

type ActionProps = ButtonProps & {
  tooltip?: string;
  children: React.ReactNode;
  onClick?: () => any;
  native?: boolean;
  variant?:
    | "secondary"
    | "default"
    | "destructive"
    | "outline"
    | "ghost"
    | "link"
    | null
    | undefined;
};
function OperationAction({
  tooltip,
  children,
  onClick,
  variant,
  native,
  className,
  ...props
}: ActionProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {variant === "destructive" ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size={`icon`}
                  className={cn(!native && `w-8 h-8`, className)}
                  variant={variant}
                  {...props}
                >
                  {children}
                </Button>
              </PopoverTrigger>
              <PopoverContent className={`w-max`}>
                <Button
                  className={`flex flex-row items-center mx-1`}
                  onClick={onClick}
                  variant={variant}
                >
                  {children}
                  <p className={`ml-1 translate-y-[-1px]`}>{tooltip}</p>
                </Button>
              </PopoverContent>
            </Popover>
          ) : (
            <Button
              size={`icon`}
              className={cn(!native && `w-8 h-8`, className)}
              onClick={onClick}
              variant={variant}
              {...props}
            >
              {children}
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default OperationAction;
