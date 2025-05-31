import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceArgsSchema"
import { UserToolGroupArgsSchema } from "../outputTypeSchemas/UserToolGroupArgsSchema"

export const UserMcpServerInstanceToolGroupIncludeSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupInclude> = z.object({
  mcpServerInstance: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceArgsSchema)]).optional(),
  toolGroup: z.union([z.boolean(),z.lazy(() => UserToolGroupArgsSchema)]).optional(),
}).strict()

export default UserMcpServerInstanceToolGroupIncludeSchema;
