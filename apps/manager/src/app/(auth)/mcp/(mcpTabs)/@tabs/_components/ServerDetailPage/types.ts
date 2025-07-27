import type { RouterOutputs } from "@/trpc/react";

export type UserMcpServerInstance = NonNullable<
  RouterOutputs["userMcpServerInstance"]["findById"]
> & {
  availableTools?: Array<{
    id: string;
    name: string;
    description: string | null;
    inputSchema: unknown;
    isEnabled: boolean;
    userMcpServerConfigId: string;
    mcpServer: {
      id: string;
      name: string;
      iconPath: string | null;
    };
  }>;
};

export type RequestStats =
  | RouterOutputs["userMcpServerInstance"]["getRequestStats"]
  | undefined;

export type RequestLogs =
  | RouterOutputs["userMcpServerInstance"]["findRequestLogs"]
  | undefined;
