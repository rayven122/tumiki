import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { RolePermissionIncludeSchema } from '../inputTypeSchemas/RolePermissionIncludeSchema'
import { RolePermissionCreateInputSchema } from '../inputTypeSchemas/RolePermissionCreateInputSchema'
import { RolePermissionUncheckedCreateInputSchema } from '../inputTypeSchemas/RolePermissionUncheckedCreateInputSchema'
import { OrganizationRoleArgsSchema } from "../outputTypeSchemas/OrganizationRoleArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const RolePermissionSelectSchema: z.ZodType<Prisma.RolePermissionSelect> = z.object({
  id: z.boolean().optional(),
  roleId: z.boolean().optional(),
  resourceType: z.boolean().optional(),
  action: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  role: z.union([z.boolean(),z.lazy(() => OrganizationRoleArgsSchema)]).optional(),
}).strict()

export const RolePermissionCreateArgsSchema: z.ZodType<Prisma.RolePermissionCreateArgs> = z.object({
  select: RolePermissionSelectSchema.optional(),
  include: z.lazy(() => RolePermissionIncludeSchema).optional(),
  data: z.union([ RolePermissionCreateInputSchema,RolePermissionUncheckedCreateInputSchema ]),
}).strict() ;

export default RolePermissionCreateArgsSchema;
