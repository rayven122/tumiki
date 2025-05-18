import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { addApiKey } from "./addApiKey";
import {
  ApiKeyIdSchema,
  ToolGroupIdSchema,
  ToolIdSchema,
  UserMcpServerIdSchema,
} from "@/schema/ids";
import { findAll } from "./findAll";
import { deleteApiKey } from "./deleteApiKey";
import {
  ApiKeySchema,
  ToolGroupSchema,
  ToolSchema,
  UserMcpServerSchema,
} from "@zod";
import { updateApiKey } from "./updateApiKey";

export const AddApiKeyInput = z.object({
  name: z.string(),
  description: z.string().default(""),
  serverToolIdsMap: z.record(UserMcpServerIdSchema, z.array(ToolIdSchema)),
});

export const DeleteApiKeyInput = z.object({
  id: UserMcpServerIdSchema,
});

export const FindAllApiKeysOutput = z.array(
  ApiKeySchema.pick({
    name: true,
    description: true,
    createdAt: true,
    updatedAt: true,
  }).merge(
    z.object({
      id: ApiKeyIdSchema,
      toolGroups: z.array(
        ToolGroupSchema.pick({ name: true, description: true }).merge(
          z.object({
            id: ToolGroupIdSchema,
            toolGroupTools: z.array(
              z.object({
                userMcpServer: UserMcpServerSchema.pick({
                  name: true,
                }).merge(
                  z.object({
                    id: UserMcpServerIdSchema,
                  }),
                ),
                tool: ToolSchema.pick({
                  name: true,
                }).merge(
                  z.object({
                    id: ToolIdSchema,
                  }),
                ),
              }),
            ),
          }),
        ),
      ),
    }),
  ),
);

export const UpdateApiKeyInput = z.object({
  id: ApiKeyIdSchema,
  name: z.string(),
  description: z.string().default(""),
  serverToolIdsMap: z.record(UserMcpServerIdSchema, z.array(ToolIdSchema)),
});

export const apiKeyRouter = createTRPCRouter({
  findAll: protectedProcedure.output(FindAllApiKeysOutput).query(findAll),
  add: protectedProcedure.input(AddApiKeyInput).mutation(addApiKey),
  delete: protectedProcedure.input(DeleteApiKeyInput).mutation(deleteApiKey),
  update: protectedProcedure.input(UpdateApiKeyInput).mutation(updateApiKey),
});
