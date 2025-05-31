import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationGroupIncludeSchema } from '../inputTypeSchemas/OrganizationGroupIncludeSchema'
import { OrganizationGroupUpdateInputSchema } from '../inputTypeSchemas/OrganizationGroupUpdateInputSchema'
import { OrganizationGroupUncheckedUpdateInputSchema } from '../inputTypeSchemas/OrganizationGroupUncheckedUpdateInputSchema'
import { OrganizationGroupWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationGroupWhereUniqueInputSchema'
import { OrganizationArgsSchema } from "./OrganizationArgsSchema"
import { OrganizationMemberFindManyArgsSchema } from "./OrganizationMemberFindManyArgsSchema"
import { OrganizationRoleFindManyArgsSchema } from "./OrganizationRoleFindManyArgsSchema"
import { ResourceAccessControlFindManyArgsSchema } from "./ResourceAccessControlFindManyArgsSchema"
import { OrganizationGroupCountOutputTypeArgsSchema } from "./OrganizationGroupCountOutputTypeArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const OrganizationGroupSelectSchema: z.ZodType<Prisma.OrganizationGroupSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  description: z.boolean().optional(),
  organizationId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  members: z.union([z.boolean(),z.lazy(() => OrganizationMemberFindManyArgsSchema)]).optional(),
  roles: z.union([z.boolean(),z.lazy(() => OrganizationRoleFindManyArgsSchema)]).optional(),
  resourceAcls: z.union([z.boolean(),z.lazy(() => ResourceAccessControlFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => OrganizationGroupCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const OrganizationGroupUpdateArgsSchema: z.ZodType<Prisma.OrganizationGroupUpdateArgs> = z.object({
  select: OrganizationGroupSelectSchema.optional(),
  include: z.lazy(() => OrganizationGroupIncludeSchema).optional(),
  data: z.union([ OrganizationGroupUpdateInputSchema,OrganizationGroupUncheckedUpdateInputSchema ]),
  where: OrganizationGroupWhereUniqueInputSchema,
}).strict() ;

export default OrganizationGroupUpdateArgsSchema;
