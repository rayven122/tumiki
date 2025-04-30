export type ApiKey = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  servers: {
    id: string;
    name: string;
  }[];
  tools: {
    id: string;
    name: string;
  }[];
  toolGroups?: {
    id: string;
    name: string;
  }[];
};

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
