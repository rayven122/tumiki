import type { JSX } from "react";
import { useAtomValue } from "jotai";
import { Bot } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { getClientLogo } from "../utils/ai-client-logo";

type ClientLogoProps = {
  clientName: string | null;
  size?: "sm" | "md";
};

export const ClientLogo = ({
  clientName,
  size = "sm",
}: ClientLogoProps): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const logo = getClientLogo(clientName);
  const px = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  if (logo) {
    return (
      <img
        src={theme === "dark" ? logo.dark : logo.light}
        alt=""
        className={`${px} shrink-0 rounded-sm`}
      />
    );
  }

  return <Bot className={`${px} shrink-0 text-[var(--text-muted)]`} />;
};
