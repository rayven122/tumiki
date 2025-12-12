import type { ReactElement, ReactNode } from "react";
import { Button as ReactEmailButton } from "@react-email/components";

interface ButtonProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "success";
}

export const Button = ({
  href,
  children,
  variant = "primary",
}: ButtonProps): ReactElement => {
  return (
    <ReactEmailButton
      href={href}
      style={{ ...buttonBase, ...variants[variant] }}
    >
      {children}
    </ReactEmailButton>
  );
};

const buttonBase = {
  display: "inline-block",
  padding: "15px 30px",
  textDecoration: "none",
  borderRadius: "8px",
  fontWeight: "600",
  fontSize: "16px",
  textAlign: "center" as const,
  cursor: "pointer",
  border: "none",
  margin: "20px 0",
};

const variants = {
  primary: {
    backgroundColor: "#000000",
    color: "#ffffff",
    border: "2px solid #000000",
  },
  secondary: {
    backgroundColor: "#6b7280",
    color: "#ffffff",
  },
  success: {
    backgroundColor: "#10b981",
    color: "#ffffff",
  },
};
