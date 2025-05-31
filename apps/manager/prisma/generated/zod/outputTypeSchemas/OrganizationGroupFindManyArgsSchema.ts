import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationGroupIncludeSchema } from '../inputTypeSchemas/OrganizationGroupIncludeSchema'
import { OrganizationGroupWhereInputSchema } from '../inputTypeSchemas/OrganizationGroupWhereInputSchema'
import { OrganizationGroupOrderByWithRelationInputSchema } from '../inputTypeSchemas/OrganizationGroupOrderByWithRelationInputSchema'
import { OrganizationGroupWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationGroupWhereUniqueInputSchema'
import { OrganizationGroupScalarFieldEnumSchema } from '../inputTypeSchemas/OrganizationGroupScalarFieldEnumSchema'
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { OrganizationMemberFindManyArgsSchema } from "../outputTypeSchemas/OrganizationMemberFindManyArgsSchema"
import { OrganizationRoleFindManyArgsSchema } from "../outputTypeSchemas/OrganizationRoleFindManyArgsSchema"
import { ResourceAccessControlFindManyArgsSchema } from "../outputTypeSchemas/ResourceAccessControlFindManyArgsSchema"
import { OrganizationGroupCountOutputTypeArgsSchema } from "../outputTypeSchemas/OrganizationGroupCountOutputTypeArgsSchema"
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

export const OrganizationGroupFindManyArgsSchema: z.ZodType<Prisma.OrganizationGroupFindManyArgs> = z.object({
  select: OrganizationGroupSelectSchema.optional(),
  include: z.lazy(() => OrganizationGroupIncludeSchema).optional(),
  where: OrganizationGroupWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationGroupOrderByWithRelationInputSchema.array(),OrganizationGroupOrderByWithRelationInputSchema ]).optional(),
  cursor: OrganizationGroupWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrganizationGroupScalarFieldEnumSchema,OrganizationGroupScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export default OrganizationGroupFindManyArgsSchema;
