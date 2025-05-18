export type UserMcpServer = {
  id: string;
  name: string;
  mcpServer: {
    id: string;
    name: string;
    iconPath: string | null;
  };
};

export type ToolGroup = {
  id: string;
  name: string;
  description: string;
  tools: {
    id: string;
    name: string;
  }[];
};
