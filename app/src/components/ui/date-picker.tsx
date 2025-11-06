import * as React from "react";
import { format } from "date-fns";

import { cn } from "@/components/ui/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarProps } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Eraser, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

type DatePickerProps = CalendarProps & {
  classNameTrigger?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

function parseDate(value?: string, init?: boolean): Date | undefined {
  try {
    if (!value) return init ? undefined : new Date();
    if (value.includes(" ")) value = value.split(" ")[0]; // Remove time
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  } catch (e) {
    console.warn("Invalid date format", value, e);
    return new Date();
  }
}

const DatePicker = ({
  value,
  onValueChange,
  classNameTrigger,
  ...props
}: DatePickerProps) => {
  const { t } = useTranslation();
  const [date, setDate] = React.useState<Date | undefined>(
    parseDate(value, true),
  );

  React.useEffect(() => {
    const v = date ? format(date, "yyyy-MM-dd") : "";
    onValueChange && onValueChange(v);
    console.debug(`[calendar] value changed: [${v}]`);
  }, [date]);

  React.useEffect(() => {
    const date = parseDate(value);
    if (!date || date.getTime() === date.getTime()) return;
    setDate(date);
  }, [value]);

  const addYear = () => {
    const current = date || new Date();
    setDate(new Date(current.setFullYear(current.getFullYear() + 1)));
  };

  const subYear = () => {
    const current = date || new Date();
    setDate(new Date(current.setFullYear(current.getFullYear() - 1)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          unClickable
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            classNameTrigger,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            `${format(date, "yyyy/MM/dd")}`
          ) : (
            <span>{t("date.pick")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date} //@ts-ignore
          onSelect={(date) => date && setDate(date)}
          initialFocus
          {...props}
        />
        <div className={cn("p-3 pt-0 flex flex-row items-center")}>
          <Button
            variant="ghost"
            size="icon"
            className={`mr-2`}
            onClick={addYear}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`mr-2`}
            onClick={subYear}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`ml-auto`}
            onClick={() => setDate(undefined)}
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
