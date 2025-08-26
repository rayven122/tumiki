export type TransportConfigStdio = {
  type?: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

export type TransportConfigSSE = {
  type: "sse";
  url: string;
};

export type TransportConfig = TransportConfigSSE | TransportConfigStdio;
export type ServerConfig = {
  name: string;
  toolNames: string[];
  transport: TransportConfig;
  googleCredentials?: Record<string, unknown> | null;
};

export type Config = {
  servers: ServerConfig[];
};
