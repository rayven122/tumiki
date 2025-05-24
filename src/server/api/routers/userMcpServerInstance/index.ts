import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { addCustomServer } from "./addCustomServer";
import {
  UserMcpServerInstanceIdSchema,
  UserToolGroupIdSchema,
  ToolIdSchema,
  UserMcpServerConfigIdSchema,
} from "@/schema/ids";
import { findCustomServers } from "./findCustomServers";

import {
  McpServerSchema,
  ServerStatusSchema,
  ServerTypeSchema,
  ToolSchema,
  UserMcpServerInstanceSchema,
  UserToolGroupSchema,
} from "@zod";

import { findOfficialServers } from "./findOfficialServers";
import { deleteServerInstance } from "./deleteServerInstance";
import { updateServerInstance } from "./updateServerInstance";
import { updateServerInstanceName } from "./updateServerInstanceName";
import { addOfficialServer } from "./addOfficialServer";

export const FindCustomServersOutput = z.array(
  UserMcpServerInstanceSchema.merge(
    z.object({
      id: UserMcpServerInstanceIdSchema,
      tools: z.array(ToolSchema),
      toolGroups: z.array(UserToolGroupSchema),
      userMcpServers: z.array(
        McpServerSchema.merge(
          z.object({
            id: UserMcpServerConfigIdSchema,
          }),
        ),
      ),
    }),
  ),
);

export const FindOfficialServersOutput = z.array(
  UserMcpServerInstanceSchema.merge(
    z.object({
      id: UserMcpServerInstanceIdSchema,
      tools: z.array(ToolSchema),
    }),
  ),
);

export const AddCustomServerInput = z.object({
  name: z.string(),
  description: z.string().default(""),
  serverToolIdsMap: z.record(
    UserMcpServerConfigIdSchema,
    z.array(ToolIdSchema),
  ),
});

export const AddOfficialServerInput = z.object({
  mcpServerId: z.string(),
  envVars: z.record(z.string(), z.string()),
});

export const DeleteServerInstanceInput = z.object({
  id: UserMcpServerInstanceIdSchema,
});

export const UpdateServerInstanceInput = z.object({
  id: UserMcpServerInstanceIdSchema,
  toolGroupId: UserToolGroupIdSchema,
  name: z.string(),
  description: z.string().default(""),
  serverStatus: ServerStatusSchema,
  serverType: ServerTypeSchema,
  serverToolIdsMap: z.record(
    UserMcpServerConfigIdSchema,
    z.array(ToolIdSchema),
  ),
});

export const UpdateServerInstanceNameInput = z.object({
  id: UserMcpServerInstanceIdSchema,
  name: z.string(),
});

export const userMcpServerInstanceRouter = createTRPCRouter({
  findCustomServers: protectedProcedure
    .output(FindCustomServersOutput)
    .query(findCustomServers),
  findOfficialServers: protectedProcedure
    .output(FindOfficialServersOutput)
    .query(findOfficialServers),
  addCustomServer: protectedProcedure
    .input(AddCustomServerInput)
    .output(z.object({}))
    .mutation(addCustomServer),
  addOfficialServer: protectedProcedure
    .input(AddOfficialServerInput)
    .output(z.object({}))
    .mutation(addOfficialServer),
  delete: protectedProcedure
    .input(DeleteServerInstanceInput)
    .output(z.object({}))
    .mutation(deleteServerInstance),
  update: protectedProcedure
    .input(UpdateServerInstanceInput)
    .output(z.object({}))
    .mutation(updateServerInstance),
  updateName: protectedProcedure
    .input(UpdateServerInstanceNameInput)
    .output(z.object({}))
    .mutation(updateServerInstanceName),
});
