import type { RouterOutputs } from "@/trpc/react";

export type UserMcpServerInstance = NonNullable<
  RouterOutputs["userMcpServerInstance"]["findById"]
>;

export type RequestStats =
  | RouterOutputs["userMcpServerInstance"]["getRequestStats"]
  | undefined;

export type RequestLogs =
  | RouterOutputs["userMcpServerInstance"]["findRequestLogs"]
  | undefined;
