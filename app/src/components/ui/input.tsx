import * as React from "react";

import { cn } from "./lib/utils";
import { Eye, EyeOff } from "lucide-react";
import Icon from "@/components/utils/Icon.tsx";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  smallSize?: boolean;
  classNameWrapper?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, smallSize, classNameWrapper, ...props }, ref) => {
    const [show, setShow] = React.useState(false);

    return !(type === "password") ? (
      <input
        type={type}
        className={cn(
          "ui-input flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-input autofill:bg-background",
          className,
        )}
        ref={ref}
        {...props}
      />
    ) : (
      <div className={cn("relative", classNameWrapper)}>
        <input
          type={show ? "text" : "password"}
          className={cn(
            "ui-input flex w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 focus:border-input pr-10 autofill:bg-background",
            className,
          )}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          className="absolute right-4 top-1/2 transform -translate-y-1/2"
          onClick={() => setShow(!show)}
        >
          <Icon
            icon={show ? <EyeOff /> : <Eye />}
            className={smallSize ? "h-3.5 w-3.5" : "h-4 w-4"}
          />
        </button>
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
