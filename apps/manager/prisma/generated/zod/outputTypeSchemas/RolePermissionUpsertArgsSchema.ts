import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { RolePermissionIncludeSchema } from '../inputTypeSchemas/RolePermissionIncludeSchema'
import { RolePermissionWhereUniqueInputSchema } from '../inputTypeSchemas/RolePermissionWhereUniqueInputSchema'
import { RolePermissionCreateInputSchema } from '../inputTypeSchemas/RolePermissionCreateInputSchema'
import { RolePermissionUncheckedCreateInputSchema } from '../inputTypeSchemas/RolePermissionUncheckedCreateInputSchema'
import { RolePermissionUpdateInputSchema } from '../inputTypeSchemas/RolePermissionUpdateInputSchema'
import { RolePermissionUncheckedUpdateInputSchema } from '../inputTypeSchemas/RolePermissionUncheckedUpdateInputSchema'
import { OrganizationRoleArgsSchema } from "./OrganizationRoleArgsSchema"
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

export const RolePermissionUpsertArgsSchema: z.ZodType<Prisma.RolePermissionUpsertArgs> = z.object({
  select: RolePermissionSelectSchema.optional(),
  include: z.lazy(() => RolePermissionIncludeSchema).optional(),
  where: RolePermissionWhereUniqueInputSchema,
  create: z.union([ RolePermissionCreateInputSchema,RolePermissionUncheckedCreateInputSchema ]),
  update: z.union([ RolePermissionUpdateInputSchema,RolePermissionUncheckedUpdateInputSchema ]),
}).strict() ;

export default RolePermissionUpsertArgsSchema;
