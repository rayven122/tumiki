import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupIncludeSchema } from '../inputTypeSchemas/UserToolGroupIncludeSchema'
import { UserToolGroupCreateInputSchema } from '../inputTypeSchemas/UserToolGroupCreateInputSchema'
import { UserToolGroupUncheckedCreateInputSchema } from '../inputTypeSchemas/UserToolGroupUncheckedCreateInputSchema'
import { UserMcpServerInstanceArgsSchema } from "./UserMcpServerInstanceArgsSchema"
import { UserArgsSchema } from "./UserArgsSchema"
import { UserToolGroupToolFindManyArgsSchema } from "./UserToolGroupToolFindManyArgsSchema"
import { OrganizationArgsSchema } from "./OrganizationArgsSchema"
import { UserMcpServerInstanceToolGroupFindManyArgsSchema } from "./UserMcpServerInstanceToolGroupFindManyArgsSchema"
import { UserToolGroupCountOutputTypeArgsSchema } from "./UserToolGroupCountOutputTypeArgsSchema"
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

export const UserToolGroupCreateArgsSchema: z.ZodType<Prisma.UserToolGroupCreateArgs> = z.object({
  select: UserToolGroupSelectSchema.optional(),
  include: z.lazy(() => UserToolGroupIncludeSchema).optional(),
  data: z.union([ UserToolGroupCreateInputSchema,UserToolGroupUncheckedCreateInputSchema ]),
}).strict() ;

export default UserToolGroupCreateArgsSchema;
