import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleIncludeSchema } from '../inputTypeSchemas/OrganizationRoleIncludeSchema'
import { OrganizationRoleWhereInputSchema } from '../inputTypeSchemas/OrganizationRoleWhereInputSchema'
import { OrganizationRoleOrderByWithRelationInputSchema } from '../inputTypeSchemas/OrganizationRoleOrderByWithRelationInputSchema'
import { OrganizationRoleWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationRoleWhereUniqueInputSchema'
import { OrganizationRoleScalarFieldEnumSchema } from '../inputTypeSchemas/OrganizationRoleScalarFieldEnumSchema'
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { RolePermissionFindManyArgsSchema } from "../outputTypeSchemas/RolePermissionFindManyArgsSchema"
import { OrganizationMemberFindManyArgsSchema } from "../outputTypeSchemas/OrganizationMemberFindManyArgsSchema"
import { OrganizationGroupFindManyArgsSchema } from "../outputTypeSchemas/OrganizationGroupFindManyArgsSchema"
import { OrganizationRoleCountOutputTypeArgsSchema } from "../outputTypeSchemas/OrganizationRoleCountOutputTypeArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const OrganizationRoleSelectSchema: z.ZodType<Prisma.OrganizationRoleSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  description: z.boolean().optional(),
  organizationId: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  permissions: z.union([z.boolean(),z.lazy(() => RolePermissionFindManyArgsSchema)]).optional(),
  members: z.union([z.boolean(),z.lazy(() => OrganizationMemberFindManyArgsSchema)]).optional(),
  groups: z.union([z.boolean(),z.lazy(() => OrganizationGroupFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => OrganizationRoleCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const OrganizationRoleFindFirstArgsSchema: z.ZodType<Prisma.OrganizationRoleFindFirstArgs> = z.object({
  select: OrganizationRoleSelectSchema.optional(),
  include: z.lazy(() => OrganizationRoleIncludeSchema).optional(),
  where: OrganizationRoleWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationRoleOrderByWithRelationInputSchema.array(),OrganizationRoleOrderByWithRelationInputSchema ]).optional(),
  cursor: OrganizationRoleWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrganizationRoleScalarFieldEnumSchema,OrganizationRoleScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export default OrganizationRoleFindFirstArgsSchema;
