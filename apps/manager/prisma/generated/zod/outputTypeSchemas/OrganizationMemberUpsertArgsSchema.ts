import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationMemberIncludeSchema } from '../inputTypeSchemas/OrganizationMemberIncludeSchema'
import { OrganizationMemberWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationMemberWhereUniqueInputSchema'
import { OrganizationMemberCreateInputSchema } from '../inputTypeSchemas/OrganizationMemberCreateInputSchema'
import { OrganizationMemberUncheckedCreateInputSchema } from '../inputTypeSchemas/OrganizationMemberUncheckedCreateInputSchema'
import { OrganizationMemberUpdateInputSchema } from '../inputTypeSchemas/OrganizationMemberUpdateInputSchema'
import { OrganizationMemberUncheckedUpdateInputSchema } from '../inputTypeSchemas/OrganizationMemberUncheckedUpdateInputSchema'
import { OrganizationArgsSchema } from "./OrganizationArgsSchema"
import { UserArgsSchema } from "./UserArgsSchema"
import { OrganizationRoleFindManyArgsSchema } from "./OrganizationRoleFindManyArgsSchema"
import { OrganizationGroupFindManyArgsSchema } from "./OrganizationGroupFindManyArgsSchema"
import { ResourceAccessControlFindManyArgsSchema } from "./ResourceAccessControlFindManyArgsSchema"
import { OrganizationMemberCountOutputTypeArgsSchema } from "./OrganizationMemberCountOutputTypeArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const OrganizationMemberSelectSchema: z.ZodType<Prisma.OrganizationMemberSelect> = z.object({
  id: z.boolean().optional(),
  organizationId: z.boolean().optional(),
  userId: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  roles: z.union([z.boolean(),z.lazy(() => OrganizationRoleFindManyArgsSchema)]).optional(),
  groups: z.union([z.boolean(),z.lazy(() => OrganizationGroupFindManyArgsSchema)]).optional(),
  resourceAcls: z.union([z.boolean(),z.lazy(() => ResourceAccessControlFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => OrganizationMemberCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const OrganizationMemberUpsertArgsSchema: z.ZodType<Prisma.OrganizationMemberUpsertArgs> = z.object({
  select: OrganizationMemberSelectSchema.optional(),
  include: z.lazy(() => OrganizationMemberIncludeSchema).optional(),
  where: OrganizationMemberWhereUniqueInputSchema,
  create: z.union([ OrganizationMemberCreateInputSchema,OrganizationMemberUncheckedCreateInputSchema ]),
  update: z.union([ OrganizationMemberUpdateInputSchema,OrganizationMemberUncheckedUpdateInputSchema ]),
}).strict() ;

export default OrganizationMemberUpsertArgsSchema;
