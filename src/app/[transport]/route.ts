import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "roll_dice",
      "Rolls an N-sided die",
      { sides: z.number().int().min(2) },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: "text", text: `🎲 You rolled a ${value}!` }],
        };
      },
    );
  },
  {
    // Optional server options
  },
  {
    // Optional configuration
    redisUrl: process.env.REDIS_URL,
    // Set the basePath to where the handler is to automatically derive all endpoints
    // This base path is for if this snippet is located at: /app/api/[transport]/route.ts
    // basePath: "/api",
    maxDuration: 60,
    verboseLogs: true,
  },
);
export { handler as GET, handler as POST };
