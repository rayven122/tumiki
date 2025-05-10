import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { addApiKey } from "./addApiKey";
import { ToolIdSchema, UserMcpServerIdSchema } from "@/schema/ids";
import { findAll } from "./findAll";

export const AddApiKeyInput = z.object({
  name: z.string(),
  description: z.string().default(""),
  serverToolIdsMap: z.record(UserMcpServerIdSchema, z.array(ToolIdSchema)),
});

// export const FindAllApiKeysOutput = z.array(ApiKeySchema);

export const apiKeyRouter = createTRPCRouter({
  add: protectedProcedure.input(AddApiKeyInput).mutation(addApiKey),
  findAll: protectedProcedure.query(findAll),
});
