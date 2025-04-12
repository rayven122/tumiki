// import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

// export class NextJsSSEAdapter {
// 	private server: Server;
// 	private transport: SSEServerTransport;
// 	private messageEndpoint: string;

// 	constructor(
// 		messageEndpoint: string,
// 		writer: WritableStreamDefaultWriter<any>,
// 	) {
// 		this.messageEndpoint = messageEndpoint;
// 		this.server = new Server(
// 			{
// 				name: "nextjs-sse-server",
// 				version: "1.0.0",
// 			},
// 			{
// 				capabilities: {},
// 			},
// 		);
// 		this.transport = new SSEServerTransport(this.messageEndpoint, writer);
// 	}

// 	async start() {
// 		console.log("SSE接続を開始しました");
// 		await this.server.connect(this.transport);
// 		return Promise.resolve();
// 	}

// 	async send(data: any) {
// 		await this.transport.send(data);
// 	}

// 	async close() {
// 		await this.writer.close();
// 	}

// 	async handleNextPostMessage(request: Request) {
// 		const data = await request.json();
// 		await this.send(data);
// 		return new Response(JSON.stringify({ success: true }), {
// 			headers: { "Content-Type": "application/json" },
// 		});
// 	}
// }
