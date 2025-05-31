import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupIncludeSchema } from '../inputTypeSchemas/UserToolGroupIncludeSchema'
import { UserToolGroupWhereUniqueInputSchema } from '../inputTypeSchemas/UserToolGroupWhereUniqueInputSchema'
import { UserToolGroupCreateInputSchema } from '../inputTypeSchemas/UserToolGroupCreateInputSchema'
import { UserToolGroupUncheckedCreateInputSchema } from '../inputTypeSchemas/UserToolGroupUncheckedCreateInputSchema'
import { UserToolGroupUpdateInputSchema } from '../inputTypeSchemas/UserToolGroupUpdateInputSchema'
import { UserToolGroupUncheckedUpdateInputSchema } from '../inputTypeSchemas/UserToolGroupUncheckedUpdateInputSchema'
import { UserMcpServerInstanceArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceArgsSchema"
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"
import { UserToolGroupToolFindManyArgsSchema } from "../outputTypeSchemas/UserToolGroupToolFindManyArgsSchema"
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { UserMcpServerInstanceToolGroupFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceToolGroupFindManyArgsSchema"
import { UserToolGroupCountOutputTypeArgsSchema } from "../outputTypeSchemas/UserToolGroupCountOutputTypeArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const UserToolGroupSelectSchema: z.ZodType<Prisma.UserToolGroupSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  description: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  userId: z.boolean().optional(),
  organizationId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  mcpServerInstance: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceArgsSchema)]).optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  toolGroupTools: z.union([z.boolean(),z.lazy(() => UserToolGroupToolFindManyArgsSchema)]).optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  mcpServerInstanceToolGroups: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceToolGroupFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserToolGroupCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const UserToolGroupUpsertArgsSchema: z.ZodType<Prisma.UserToolGroupUpsertArgs> = z.object({
  select: UserToolGroupSelectSchema.optional(),
  include: z.lazy(() => UserToolGroupIncludeSchema).optional(),
  where: UserToolGroupWhereUniqueInputSchema,
  create: z.union([ UserToolGroupCreateInputSchema,UserToolGroupUncheckedCreateInputSchema ]),
  update: z.union([ UserToolGroupUpdateInputSchema,UserToolGroupUncheckedUpdateInputSchema ]),
}).strict() ;

export default UserToolGroupUpsertArgsSchema;
