export type Role = string;

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  department?: string;
  joinedAt: string;
  status: "active" | "invited" | "inactive";
  lastLogin?: string;
  invitedBy?: string;
};

export type MCPTool = {
  id: string;
  name: string;
  description: string;
};

export type MCPServer = {
  id: string;
  name: string;
  description: string;
  logo?: string;
  tools: MCPTool[];
};
