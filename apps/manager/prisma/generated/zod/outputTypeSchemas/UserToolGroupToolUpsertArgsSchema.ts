import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupToolIncludeSchema } from '../inputTypeSchemas/UserToolGroupToolIncludeSchema'
import { UserToolGroupToolWhereUniqueInputSchema } from '../inputTypeSchemas/UserToolGroupToolWhereUniqueInputSchema'
import { UserToolGroupToolCreateInputSchema } from '../inputTypeSchemas/UserToolGroupToolCreateInputSchema'
import { UserToolGroupToolUncheckedCreateInputSchema } from '../inputTypeSchemas/UserToolGroupToolUncheckedCreateInputSchema'
import { UserToolGroupToolUpdateInputSchema } from '../inputTypeSchemas/UserToolGroupToolUpdateInputSchema'
import { UserToolGroupToolUncheckedUpdateInputSchema } from '../inputTypeSchemas/UserToolGroupToolUncheckedUpdateInputSchema'
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

export const UserToolGroupToolUpsertArgsSchema: z.ZodType<Prisma.UserToolGroupToolUpsertArgs> = z.object({
  select: UserToolGroupToolSelectSchema.optional(),
  include: z.lazy(() => UserToolGroupToolIncludeSchema).optional(),
  where: UserToolGroupToolWhereUniqueInputSchema,
  create: z.union([ UserToolGroupToolCreateInputSchema,UserToolGroupToolUncheckedCreateInputSchema ]),
  update: z.union([ UserToolGroupToolUpdateInputSchema,UserToolGroupToolUncheckedUpdateInputSchema ]),
}).strict() ;

export default UserToolGroupToolUpsertArgsSchema;
