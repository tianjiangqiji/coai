import * as React from "react";

import { cn } from "./lib/utils.ts";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area.tsx";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Check, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  classNameWrapper?: string;
  classNameArea?: string;
};

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, classNameWrapper, classNameArea, ...props }, ref) => (
    <ScrollArea type="always" className={classNameArea}>
      <div className={cn("relative w-full mb-2", classNameWrapper)}>
        <table
          ref={ref}
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
      <ScrollBar className="cursor-pointer" orientation="horizontal" />
    </ScrollArea>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("bg-primary font-medium text-primary-foreground", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-4 py-1.5 md:py-2 align-middle [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export type Visibility = {
  [key: string]: boolean;
};

export type VisibilityOptions = {
  translatePrefix?: string;
};

export type Column = { key: string; name: string; value: boolean };

export const useColumnsVisibility = (
  initial: Visibility,
  options?: VisibilityOptions,
) => {
  const [visibility, setVisibility] = React.useState(initial);
  const bar = useMemo(
    (): Column[] =>
      Object.entries(visibility).map(([name, value]) => ({
        key: name,
        name: options?.translatePrefix
          ? `${options.translatePrefix}.${name}`
          : name,
        value,
      })),
    [visibility, options],
  );

  const toggle = (key: string) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const show = (key: string) => {
    setVisibility((prev) => ({ ...prev, [key]: true }));
  };

  const hide = (key: string) => {
    setVisibility((prev) => ({ ...prev, [key]: false }));
  };

  const merge = (key: string, ...args: string[]) => {
    return cn(...args, !visibility[key] && "hidden");
  };

  return { visibility, bar, options, toggle, show, hide, merge };
};

type ColumnsVisibilityBarProps = {
  bar: Column[];
  toggle: (key: string) => void;
};

export const ColumnsVisibilityBar = ({
  bar,
  toggle,
}: ColumnsVisibilityBarProps) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={`ml-2 shrink-0`} variant={`outline`} size={`icon`}>
          <Filter className={`h-4 w-4`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={`end`}>
        {bar.map(({ key, name, value }) => (
          <DropdownMenuItem
            key={key}
            onClick={(e) => {
              e.preventDefault();
              toggle(key);
            }}
          >
            <Check
              className={cn("h-4 w-4 mr-1 opacity-0", value && "opacity-100")}
            />
            {t(name)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
