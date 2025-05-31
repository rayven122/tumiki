import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceArgsSchema"
import { UserToolGroupArgsSchema } from "../outputTypeSchemas/UserToolGroupArgsSchema"

export const UserMcpServerInstanceToolGroupSelectSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupSelect> = z.object({
  mcpServerInstanceId: z.boolean().optional(),
  toolGroupId: z.boolean().optional(),
  sortOrder: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  mcpServerInstance: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceArgsSchema)]).optional(),
  toolGroup: z.union([z.boolean(),z.lazy(() => UserToolGroupArgsSchema)]).optional(),
}).strict()

export default UserMcpServerInstanceToolGroupSelectSchema;
