import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  children: ReactNode;
};

export const Field = ({ label, children }: FieldProps) => (
  <div>
    <label className="text-text-secondary mb-1 block text-[11px]">
      {label}
    </label>
    {children}
  </div>
);
