import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupIncludeSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupIncludeSchema'
import { UserMcpServerInstanceToolGroupCreateInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupCreateInputSchema'
import { UserMcpServerInstanceToolGroupUncheckedCreateInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupUncheckedCreateInputSchema'
import { UserMcpServerInstanceArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceArgsSchema"
import { UserToolGroupArgsSchema } from "../outputTypeSchemas/UserToolGroupArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const UserMcpServerInstanceToolGroupSelectSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupSelect> = z.object({
  mcpServerInstanceId: z.boolean().optional(),
  toolGroupId: z.boolean().optional(),
  sortOrder: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  mcpServerInstance: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceArgsSchema)]).optional(),
  toolGroup: z.union([z.boolean(),z.lazy(() => UserToolGroupArgsSchema)]).optional(),
}).strict()

export const UserMcpServerInstanceToolGroupCreateArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateArgs> = z.object({
  select: UserMcpServerInstanceToolGroupSelectSchema.optional(),
  include: z.lazy(() => UserMcpServerInstanceToolGroupIncludeSchema).optional(),
  data: z.union([ UserMcpServerInstanceToolGroupCreateInputSchema,UserMcpServerInstanceToolGroupUncheckedCreateInputSchema ]),
}).strict() ;

export default UserMcpServerInstanceToolGroupCreateArgsSchema;
