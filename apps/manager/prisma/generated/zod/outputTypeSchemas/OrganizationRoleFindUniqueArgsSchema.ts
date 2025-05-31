import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleIncludeSchema } from '../inputTypeSchemas/OrganizationRoleIncludeSchema'
import { OrganizationRoleWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationRoleWhereUniqueInputSchema'
import { OrganizationArgsSchema } from "./OrganizationArgsSchema"
import { RolePermissionFindManyArgsSchema } from "./RolePermissionFindManyArgsSchema"
import { OrganizationMemberFindManyArgsSchema } from "./OrganizationMemberFindManyArgsSchema"
import { OrganizationGroupFindManyArgsSchema } from "./OrganizationGroupFindManyArgsSchema"
import { OrganizationRoleCountOutputTypeArgsSchema } from "./OrganizationRoleCountOutputTypeArgsSchema"
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

export const OrganizationRoleFindUniqueArgsSchema: z.ZodType<Prisma.OrganizationRoleFindUniqueArgs> = z.object({
  select: OrganizationRoleSelectSchema.optional(),
  include: z.lazy(() => OrganizationRoleIncludeSchema).optional(),
  where: OrganizationRoleWhereUniqueInputSchema,
}).strict() ;

export default OrganizationRoleFindUniqueArgsSchema;
