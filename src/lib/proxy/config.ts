export type TransportConfigStdio = {
	type?: "stdio";
	command: string;
	args?: string[];
	env?: string[];
};

export type TransportConfigSSE = {
	type: "sse";
	url: string;
};

export type TransportConfig = TransportConfigSSE | TransportConfigStdio;
export interface ServerConfig {
	name: string;
	transport: TransportConfig;
}

export interface Config {
	servers: ServerConfig[];
}

// export const loadConfig = async (): Promise<Config> => {
//   try {
//     const configPath = resolve(process.cwd(), 'config.json');
//     const fileContents = await readFile(configPath, 'utf-8');
//     return JSON.parse(fileContents);
//   } catch (error) {
//     console.error('Error loading config.json:', error);
//     // Return empty config if file doesn't exist
//     return { servers: [] };
//   }
// };

const hardcodedConfig: Config = {
	servers: [
		// {
		//   name: "Playwright MCP",
		//   transport: {
		//     command: "npx",
		//     args: ["@playwright/mcp@latest"],
		//   },
		// },
		{
			name: "Notion MCP",
			transport: {
				command: "/Users/suzusanhidetoshi/.volta/bin/node",
				// command: "/root/.nix-profile/bin/node",
				args: ["node_modules/@suekou/mcp-notion-server/build/index.js"],
				env: ["NOTION_API_TOKEN"],
			},
		},
		{
			name: "GitHub MCP",
			transport: {
				command: "/Users/suzusanhidetoshi/.volta/bin/node",
				// command: "/root/.nix-profile/bin/node",
				args: [
					"node_modules/@modelcontextprotocol/server-github/dist/index.js",
				],
				env: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
			},
		},
	],
};

export const loadConfig = async (): Promise<Config> => {
	return hardcodedConfig;
};
