import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupToolIncludeSchema } from '../inputTypeSchemas/UserToolGroupToolIncludeSchema'
import { UserToolGroupToolUpdateInputSchema } from '../inputTypeSchemas/UserToolGroupToolUpdateInputSchema'
import { UserToolGroupToolUncheckedUpdateInputSchema } from '../inputTypeSchemas/UserToolGroupToolUncheckedUpdateInputSchema'
import { UserToolGroupToolWhereUniqueInputSchema } from '../inputTypeSchemas/UserToolGroupToolWhereUniqueInputSchema'
import { UserMcpServerConfigArgsSchema } from "./UserMcpServerConfigArgsSchema"
import { UserToolGroupArgsSchema } from "./UserToolGroupArgsSchema"
import { ToolArgsSchema } from "./ToolArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const UserToolGroupToolSelectSchema: z.ZodType<Prisma.UserToolGroupToolSelect> = z.object({
  userMcpServerConfigId: z.boolean().optional(),
  toolGroupId: z.boolean().optional(),
  toolId: z.boolean().optional(),
  sortOrder: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  userMcpServerConfig: z.union([z.boolean(),z.lazy(() => UserMcpServerConfigArgsSchema)]).optional(),
  toolGroup: z.union([z.boolean(),z.lazy(() => UserToolGroupArgsSchema)]).optional(),
  tool: z.union([z.boolean(),z.lazy(() => ToolArgsSchema)]).optional(),
}).strict()

export const UserToolGroupToolUpdateArgsSchema: z.ZodType<Prisma.UserToolGroupToolUpdateArgs> = z.object({
  select: UserToolGroupToolSelectSchema.optional(),
  include: z.lazy(() => UserToolGroupToolIncludeSchema).optional(),
  data: z.union([ UserToolGroupToolUpdateInputSchema,UserToolGroupToolUncheckedUpdateInputSchema ]),
  where: UserToolGroupToolWhereUniqueInputSchema,
}).strict() ;

export default UserToolGroupToolUpdateArgsSchema;
