import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupToolIncludeSchema } from '../inputTypeSchemas/UserToolGroupToolIncludeSchema'
import { UserToolGroupToolCreateInputSchema } from '../inputTypeSchemas/UserToolGroupToolCreateInputSchema'
import { UserToolGroupToolUncheckedCreateInputSchema } from '../inputTypeSchemas/UserToolGroupToolUncheckedCreateInputSchema'
import { UserMcpServerConfigArgsSchema } from "../outputTypeSchemas/UserMcpServerConfigArgsSchema"
import { UserToolGroupArgsSchema } from "../outputTypeSchemas/UserToolGroupArgsSchema"
import { ToolArgsSchema } from "../outputTypeSchemas/ToolArgsSchema"
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

export const UserToolGroupToolCreateArgsSchema: z.ZodType<Prisma.UserToolGroupToolCreateArgs> = z.object({
  select: UserToolGroupToolSelectSchema.optional(),
  include: z.lazy(() => UserToolGroupToolIncludeSchema).optional(),
  data: z.union([ UserToolGroupToolCreateInputSchema,UserToolGroupToolUncheckedCreateInputSchema ]),
}).strict() ;

export default UserToolGroupToolCreateArgsSchema;
