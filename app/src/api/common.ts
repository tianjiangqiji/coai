import { toast } from "sonner";

export type CommonResponse = {
  status: boolean;
  error?: string;
  reason?: string;
  message?: string;
  data?: any;
};

export function withNotify(
  t: any,
  state: CommonResponse,
  toastSuccess?: boolean,
  toastSuccessMessage?: string,
) {
  if (state.status)
    toastSuccess &&
      toast.success(t("success"), {
        description: toastSuccessMessage || t("request-success"),
      });
  else
    toast.error(t("error"), {
      description:
        state.error ?? state.reason ?? state.message ?? "error occurred",
    });
}
