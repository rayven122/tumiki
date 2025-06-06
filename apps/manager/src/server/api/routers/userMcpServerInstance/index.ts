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
  ToolSchema,
  UserMcpServerInstanceSchema,
  UserToolGroupSchema,
} from "@zod";

import { findOfficialServers } from "./findOfficialServers";
import { deleteServerInstance } from "./deleteServerInstance";
import { updateServerInstance } from "./updateServerInstance";
import { updateServerInstanceName } from "./updateServerInstanceName";
import { addOfficialServer } from "./addOfficialServer";
import { updateServerStatus } from "./updateServerStatus";

export const FindServersOutput = z.array(
  UserMcpServerInstanceSchema.merge(
    z.object({
      id: UserMcpServerInstanceIdSchema,
      tools: z.array(
        ToolSchema.merge(
          z.object({
            id: ToolIdSchema,
            userMcpServerConfigId: UserMcpServerConfigIdSchema,
          }),
        ),
      ),
      toolGroups: z.array(
        UserToolGroupSchema.merge(
          z.object({
            id: UserToolGroupIdSchema,
          }),
        ),
      ),
      userMcpServers: z.array(
        McpServerSchema.merge(
          z.object({
            id: UserMcpServerConfigIdSchema,
            tools: z.array(
              ToolSchema.merge(
                z.object({
                  id: ToolIdSchema,
                }),
              ),
            ),
          }),
        ),
      ),
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
  toolGroupId: UserToolGroupIdSchema,
  name: z.string(),
  description: z.string().default(""),
  serverToolIdsMap: z.record(
    UserMcpServerConfigIdSchema,
    z.array(ToolIdSchema),
  ),
});

export const UpdateServerInstanceNameInput = z.object({
  id: UserMcpServerInstanceIdSchema,
  name: z.string(),
});

export const UpdateServerStatusInput = UserMcpServerInstanceSchema.pick({
  serverStatus: true,
}).merge(
  z.object({
    id: UserMcpServerInstanceIdSchema,
  }),
);

export const userMcpServerInstanceRouter = createTRPCRouter({
  findCustomServers: protectedProcedure
    .output(FindServersOutput)
    .query(findCustomServers),
  findOfficialServers: protectedProcedure
    .output(FindServersOutput)
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
  updateStatus: protectedProcedure
    .input(UpdateServerStatusInput)
    .output(z.object({}))
    .mutation(updateServerStatus),
});
