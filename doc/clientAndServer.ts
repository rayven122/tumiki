// Writing MCP Clients
// The SDK provides a high-level client interface:

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
	command: "node",
	args: ["server.js"],
});

const client = new Client({
	name: "example-client",
	version: "1.0.0",
});

await client.connect(transport);

// List prompts
const prompts = await client.listPrompts();

// Get a prompt
const prompt = await client.getPrompt({
	name: "example-prompt",
	arguments: {
		arg1: "value",
	},
});

// List resources
const resources = await client.listResources();

// Read a resource
const resource = await client.readResource({
	uri: "file:///example.txt",
});

// Call a tool
const result = await client.callTool({
	name: "example-tool",
	arguments: {
		arg1: "value",
	},
});

// Low-Level Server
// For more control, you can use the low-level Server class directly:

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	GetPromptRequestSchema,
	ListPromptsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
	{
		name: "example-server",
		version: "1.0.0",
	},
	{
		capabilities: {
			prompts: {},
		},
	},
);

server.setRequestHandler(ListPromptsRequestSchema, async () => {
	return {
		prompts: [
			{
				name: "example-prompt",
				description: "An example prompt template",
				arguments: [
					{
						name: "arg1",
						description: "Example argument",
						required: true,
					},
				],
			},
		],
	};
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
	if (request.params.name !== "example-prompt") {
		throw new Error("Unknown prompt");
	}
	return {
		description: "Example prompt",
		messages: [
			{
				role: "user",
				content: {
					type: "text",
					text: "Example prompt text",
				},
			},
		],
	};
});

const transport = new StdioServerTransport();
await server.connect(transport);
