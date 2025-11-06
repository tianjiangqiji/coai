import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { mobile } from "@/utils/device.ts";
import React, { useEffect, useState } from "react";
import { Badge } from "./ui/badge.tsx";
import { cn } from "@/components/ui/lib/utils.ts";
import Tips from "./Tips.tsx";

export type SingleSelectItemBadgeProps = {
  variant: string;
  name?: string;
  icon?: React.ReactNode;
  className?: string;
  tooltip?: string;
};

export type SelectItemBadgeProps =
  | SingleSelectItemBadgeProps
  | SingleSelectItemBadgeProps[];

export type SelectItemProps = {
  name: string;
  value: string;
  badge?: SelectItemBadgeProps;
  tag?: any;
  icon?: React.ReactNode;
};

type SelectGroupProps = {
  current: SelectItemProps;
  list: SelectItemProps[];
  onChange?: (select: string) => void;
  maxElements?: number;
  className?: string;
  classNameDesktop?: string;
  classNameMobile?: string;
  side?: "left" | "right" | "top" | "bottom";

  selectGroupTop?: SelectItemProps;
  selectGroupBottom?: SelectItemProps;
};

export function SingleGroupSelectItemBadge(props: SingleSelectItemBadgeProps) {
  const Comp = (
    <Badge
      className={cn(
        "w-5 h-5 p-1 rounded-sm ml-1.5 hover",
        {
          "text-primary bg-primary/5 hover:bg-primary/10":
            props.variant === "default",
          "text-amber-600 bg-amber-500/20 hover:bg-amber-500/30":
            props.variant === "gold",
          "text-blue-600 bg-blue-500/20 hover:bg-blue-500/30":
            props.variant === "multi-modal",
          "text-green-600 bg-green-500/20 hover:bg-green-500/30":
            props.variant === "web",
          "text-purple-600 bg-purple-500/20 hover:bg-purple-500/30":
            props.variant === "high-quality",
          "text-red-600 bg-red-500/20 hover:bg-red-500/30":
            props.variant === "high-price",
          "text-gray-600 bg-gray-500/20 hover:bg-gray-500/30":
            props.variant === "open-source",
          "text-indigo-600 bg-indigo-500/20 hover:bg-indigo-500/30":
            props.variant === "image-generation",
          "text-yellow-600 bg-yellow-500/20 hover:bg-yellow-500/30":
            props.variant === "fast",
          "text-orange-600 bg-orange-500/20 hover:bg-orange-500/30":
            props.variant === "unstable",
          "text-teal-600 bg-teal-500/20 hover:bg-teal-500/30":
            props.variant === "high-context",
          "text-emerald-600 bg-emerald-500/20 hover:bg-emerald-500/30":
            props.variant === "free",
        },
        props.className,
      )}
    >
      {props.icon}
      {props.name}
    </Badge>
  );

  return props.tooltip ? <Tips trigger={Comp}>{props.tooltip}</Tips> : Comp;
}

function GroupSelectItemBadge(props: { data: SelectItemBadgeProps }) {
  return Array.isArray(props.data) ? (
    props.data.map((badge) => <SingleGroupSelectItemBadge {...badge} />)
  ) : (
    <SingleGroupSelectItemBadge {...props.data} />
  );
}

export function GroupSelectItem(props: SelectItemProps) {
  return (
    <div
      className={`mr-1 flex flex-row items-center align-center whitespace-nowrap text-sm`}
    >
      {props.icon && <div className={`mr-1.5`}>{props.icon}</div>}
      {props.value}
      {props.badge && <GroupSelectItemBadge data={props.badge} />}
    </div>
  );
}

function SelectGroupDesktop(props: SelectGroupProps) {
  const max: number = props.maxElements || 5;
  const range = props.list.length > max ? max : props.list.length;
  const display = props.list.slice(0, range);
  const hidden = props.list.slice(range);

  return (
    <div className={`select-group`}>
      {display.map((select: SelectItemProps, idx: number) => (
        <div
          key={idx}
          onClick={() => props.onChange?.(select.name)}
          className={`select-group-item ${
            select == props.current ? "active" : ""
          }`}
        >
          <GroupSelectItem {...select} />
        </div>
      ))}

      {props.list.length > max && (
        <Select
          defaultValue={"..."}
          value={props.current?.name || "..."}
          onValueChange={(value: string) => props.onChange?.(value)}
        >
          <SelectTrigger
            className={`w-max gap-1 select-group-item ${
              hidden.includes(props.current) ? "active" : ""
            }`}
          >
            <SelectValue asChild>
              <span>
                {hidden.includes(props.current) ? (
                  <GroupSelectItem {...props.current} />
                ) : (
                  "..."
                )}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            className={`${props.className} ${props.classNameDesktop}`}
          >
            {props.selectGroupTop && (
              <SelectItem
                value={props.selectGroupTop.name}
                onClick={() => props.onChange?.(props.selectGroupTop!.name)}
              >
                <GroupSelectItem {...props.selectGroupTop} />
              </SelectItem>
            )}

            {hidden.map((select: SelectItemProps, idx: number) => (
              <SelectItem key={idx} value={select.name}>
                <GroupSelectItem {...select} />
              </SelectItem>
            ))}

            {props.selectGroupBottom && (
              <SelectItem
                value={props.selectGroupBottom.name}
                onClick={() => props.onChange?.(props.selectGroupBottom!.name)}
              >
                <GroupSelectItem {...props.selectGroupBottom} />
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function SelectGroupMobile(props: SelectGroupProps) {
  return (
    <div className={`mb-2 w-full`}>
      <Select
        value={props.current?.name || ""}
        onValueChange={(value: string) => {
          props.onChange?.(value);
        }}
      >
        <SelectTrigger className="select-group mobile whitespace-nowrap flex-nowrap">
          <SelectValue placeholder={props.current?.value || ""} />
        </SelectTrigger>
        <SelectContent
          className={`${props.className} ${props.classNameMobile}`}
        >
          {props.selectGroupTop && (
            <SelectItem
              value={props.selectGroupTop.name}
              onClick={() => props.onChange?.(props.selectGroupTop!.name)}
            >
              <GroupSelectItem {...props.selectGroupTop} />
            </SelectItem>
          )}

          {props.list.map((select: SelectItemProps, idx: number) => (
            <SelectItem
              className={`whitespace-nowrap`}
              key={idx}
              value={select.name}
            >
              <GroupSelectItem {...select} />
            </SelectItem>
          ))}

          {props.selectGroupBottom && (
            <SelectItem
              value={props.selectGroupBottom.name}
              onClick={() => props.onChange?.(props.selectGroupBottom!.name)}
            >
              <GroupSelectItem {...props.selectGroupBottom} />
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

function SelectGroup(props: SelectGroupProps) {
  const [state, setState] = useState(mobile);
  useEffect(() => {
    window.addEventListener("resize", () => {
      setState(mobile);
    });
  }, []);

  return state ? (
    <SelectGroupMobile {...props} />
  ) : (
    <SelectGroupDesktop {...props} />
  );
}

export default SelectGroup;
