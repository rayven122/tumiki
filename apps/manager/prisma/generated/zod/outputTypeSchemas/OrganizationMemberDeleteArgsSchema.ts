import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationMemberIncludeSchema } from '../inputTypeSchemas/OrganizationMemberIncludeSchema'
import { OrganizationMemberWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationMemberWhereUniqueInputSchema'
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"
import { OrganizationRoleFindManyArgsSchema } from "../outputTypeSchemas/OrganizationRoleFindManyArgsSchema"
import { OrganizationGroupFindManyArgsSchema } from "../outputTypeSchemas/OrganizationGroupFindManyArgsSchema"
import { ResourceAccessControlFindManyArgsSchema } from "../outputTypeSchemas/ResourceAccessControlFindManyArgsSchema"
import { OrganizationMemberCountOutputTypeArgsSchema } from "../outputTypeSchemas/OrganizationMemberCountOutputTypeArgsSchema"
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

export const OrganizationMemberDeleteArgsSchema: z.ZodType<Prisma.OrganizationMemberDeleteArgs> = z.object({
  select: OrganizationMemberSelectSchema.optional(),
  include: z.lazy(() => OrganizationMemberIncludeSchema).optional(),
  where: OrganizationMemberWhereUniqueInputSchema,
}).strict() ;

export default OrganizationMemberDeleteArgsSchema;
