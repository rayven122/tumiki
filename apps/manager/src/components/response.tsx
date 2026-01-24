"use client";

import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { cn } from "@/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = ({ className, children, ...props }: ResponseProps) => {
  return (
    <Streamdown
      className={cn(
        "size-full [&_code]:break-words [&_code]:whitespace-pre-wrap [&_pre]:max-w-full [&_pre]:overflow-x-auto [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      plugins={{ code }}
      {...props}
    >
      {children}
    </Streamdown>
  );
};
