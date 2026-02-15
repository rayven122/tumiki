import type { ReactNode } from "react";
import { toast as reactToast, type ToastOptions } from "react-toastify";

export const toast = {
  success: (content: ReactNode, options?: ToastOptions) =>
    reactToast.success(content, options),
  error: (content: ReactNode, options?: ToastOptions) =>
    reactToast.error(content, options),
  info: (content: ReactNode, options?: ToastOptions) =>
    reactToast.info(content, options),
};
