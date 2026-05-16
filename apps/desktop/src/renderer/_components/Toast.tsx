import type { JSX } from "react";
import { toast as sonnerToast } from "sonner";
import { CheckCircle, AlertCircle, AlertTriangle } from "lucide-react";

const iconsByType: Record<"success" | "error" | "warning", JSX.Element> = {
  success: (
    <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
  ),
  error: <AlertCircle size={16} className="text-red-600 dark:text-red-400" />,
  warning: (
    <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
  ),
};

type ToastProps = {
  id: string | number;
  type: "success" | "error" | "warning";
  description: string;
};

const Toast = ({ id, type, description }: ToastProps): JSX.Element => (
  <div className="flex w-full justify-center">
    <div
      key={id}
      className="flex w-fit items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 shadow-xl dark:border-white/[.08] dark:bg-zinc-900"
    >
      {iconsByType[type]}
      <span className="text-sm text-gray-900 dark:text-white">
        {description}
      </span>
    </div>
  </div>
);

export const toast = {
  success: (description: string) =>
    sonnerToast.custom((id) => (
      <Toast id={id} type="success" description={description} />
    )),
  error: (description: string) =>
    sonnerToast.custom((id) => (
      <Toast id={id} type="error" description={description} />
    )),
  warning: (description: string) =>
    sonnerToast.custom((id) => (
      <Toast id={id} type="warning" description={description} />
    )),
};
