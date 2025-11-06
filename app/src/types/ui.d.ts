declare module "@radix-ui/react-select-area";

declare module "sonner" {
  export interface ToastProps {
    description?: string | React.ReactNode;
    action?: {
      label: string;
      onClick: () => void;
    };
    duration?: number;
  }

  export const Toaster: React.FC;

  export type ToastFunc = (title: string, options?: ToastProps) => void;
  export type ToastPromise = (promise: Promise<any>, options?: any) => void;

  export const toast: {
    (title: string, options?: ToastProps): void;

    info: ToastFunc;
    success: ToastFunc;
    error: ToastFunc;
    loading: ToastFunc;
    warning: ToastFunc;
    action: ToastFunc;
    promise: ToastPromise;
  };
}
