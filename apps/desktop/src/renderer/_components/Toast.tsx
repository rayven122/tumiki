import type { JSX } from "react";
import { toast as sonnerToast } from "sonner";
import { CheckCircle, AlertCircle } from "lucide-react";

const iconsByType: Record<"success" | "error", JSX.Element> = {
  success: (
    <CheckCircle size={16} style={{ color: "var(--badge-success-text)" }} />
  ),
  error: <AlertCircle size={16} style={{ color: "var(--badge-error-text)" }} />,
};

type ToastProps = {
  id: string | number;
  type: "success" | "error";
  description: string;
};

const Toast = ({ id, type, description }: ToastProps): JSX.Element => (
  <div className="flex w-full justify-center">
    <div
      key={id}
      className="flex w-fit items-center gap-2.5 rounded-lg px-4 py-2.5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      }}
    >
      {iconsByType[type]}
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>
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
};
