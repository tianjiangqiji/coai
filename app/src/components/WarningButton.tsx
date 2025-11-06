import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogEmoji,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/components/ui/lib/utils";
import { useTranslation } from "react-i18next";

type WarningButtonProps = ButtonProps & {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  children?: React.ReactNode;
};

export default function WarningButton({
  variant,
  title,
  description,
  confirmText,
  cancelText,
  children,
  className,
  onClick,
  ...props
}: WarningButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleClick = onClick
    ? async () => {
        //@ts-ignore
        await onClick?.();
        setOpen(false);
      }
    : undefined;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          className={cn("flex items-center", className)}
          {...props}
        >
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogEmoji emoji="1f641" />
          <AlertDialogTitle>{title || t("are-you-sure")}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || t("this-action-cannot-be-undone")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText || t("cancel")}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              unClickable
              loading={true}
              onClick={handleClick}
              variant={`destructive`}
            >
              {confirmText || t("confirm")}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
