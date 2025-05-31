import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigArgsSchema } from "../outputTypeSchemas/UserMcpServerConfigArgsSchema"
import { UserToolGroupArgsSchema } from "../outputTypeSchemas/UserToolGroupArgsSchema"
import { ToolArgsSchema } from "../outputTypeSchemas/ToolArgsSchema"

export const UserToolGroupToolIncludeSchema: z.ZodType<Prisma.UserToolGroupToolInclude> = z.object({
  userMcpServerConfig: z.union([z.boolean(),z.lazy(() => UserMcpServerConfigArgsSchema)]).optional(),
  toolGroup: z.union([z.boolean(),z.lazy(() => UserToolGroupArgsSchema)]).optional(),
  tool: z.union([z.boolean(),z.lazy(() => ToolArgsSchema)]).optional(),
}).strict()

export default UserToolGroupToolIncludeSchema;
