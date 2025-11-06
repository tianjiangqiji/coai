import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group.tsx";
import { Label } from "@/components/ui/label.tsx";
import Icon from "@/components/utils/Icon.tsx";
import { cn } from "@/components/ui/lib/utils.ts";

export type RadioBoxItemProps = {
  id: string;
  value: string;
};

export type RadioBoxProps = {
  title: string;
  icon?: React.ReactElement;
  prefix?: string;
  defaultValue?: string;
  items: RadioBoxItemProps[];

  value?: string;
  onValueChange?: (value: string) => void;
  colLayout?: boolean;
  className?: string;
};

export const RadioBox = React.forwardRef<
  React.ElementRef<typeof RadioGroup>,
  RadioBoxProps
>(
  (
    {
      title,
      icon,
      prefix,
      items,
      colLayout,
      defaultValue,
      value,
      onValueChange,
      className,
    },
    ref,
  ) => {
    return (
      <div
        className={cn(
          `inline-flex flex-row text-sm items-center mb-2`,
          colLayout && "items-start",
          className,
        )}
        ref={ref}
      >
        <div className="flex flex-row items-center select-none mr-2">
          {icon && <Icon icon={icon} className={`w-3.5 h-3.5 mr-1`} />}
          <p>{title}</p>
        </div>
        <RadioGroup
          defaultValue={defaultValue}
          className={cn(
            colLayout ? "grid grid-cols-2 gap-2" : "flex flex-row space-x-1",
          )}
          value={value}
          onValueChange={onValueChange}
        >
          {items.map((item, index) => {
            return (
              <div
                key={index}
                className="flex items-center space-x-1 cursor-pointer"
                onClick={() => onValueChange && onValueChange(item.id)}
              >
                <RadioGroupItem value={item.id} id={`${prefix}-${item.id}`} />
                <Label
                  className={`cursor-pointer`}
                  htmlFor={`${prefix}-${item.id}`}
                >
                  {item.value}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  },
);
RadioBox.displayName = "RadioBox";
