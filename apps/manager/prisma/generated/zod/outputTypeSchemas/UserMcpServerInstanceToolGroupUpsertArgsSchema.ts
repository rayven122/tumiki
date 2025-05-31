import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupIncludeSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupIncludeSchema'
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupWhereUniqueInputSchema'
import { UserMcpServerInstanceToolGroupCreateInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupCreateInputSchema'
import { UserMcpServerInstanceToolGroupUncheckedCreateInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupUncheckedCreateInputSchema'
import { UserMcpServerInstanceToolGroupUpdateInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupUpdateInputSchema'
import { UserMcpServerInstanceToolGroupUncheckedUpdateInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupUncheckedUpdateInputSchema'
import { UserMcpServerInstanceArgsSchema } from "./UserMcpServerInstanceArgsSchema"
import { UserToolGroupArgsSchema } from "./UserToolGroupArgsSchema"
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

export const UserMcpServerInstanceToolGroupUpsertArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpsertArgs> = z.object({
  select: UserMcpServerInstanceToolGroupSelectSchema.optional(),
  include: z.lazy(() => UserMcpServerInstanceToolGroupIncludeSchema).optional(),
  where: UserMcpServerInstanceToolGroupWhereUniqueInputSchema,
  create: z.union([ UserMcpServerInstanceToolGroupCreateInputSchema,UserMcpServerInstanceToolGroupUncheckedCreateInputSchema ]),
  update: z.union([ UserMcpServerInstanceToolGroupUpdateInputSchema,UserMcpServerInstanceToolGroupUncheckedUpdateInputSchema ]),
}).strict() ;

export default UserMcpServerInstanceToolGroupUpsertArgsSchema;
