import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { RolePermissionIncludeSchema } from '../inputTypeSchemas/RolePermissionIncludeSchema'
import { RolePermissionWhereInputSchema } from '../inputTypeSchemas/RolePermissionWhereInputSchema'
import { RolePermissionOrderByWithRelationInputSchema } from '../inputTypeSchemas/RolePermissionOrderByWithRelationInputSchema'
import { RolePermissionWhereUniqueInputSchema } from '../inputTypeSchemas/RolePermissionWhereUniqueInputSchema'
import { RolePermissionScalarFieldEnumSchema } from '../inputTypeSchemas/RolePermissionScalarFieldEnumSchema'
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

export const RolePermissionFindFirstArgsSchema: z.ZodType<Prisma.RolePermissionFindFirstArgs> = z.object({
  select: RolePermissionSelectSchema.optional(),
  include: z.lazy(() => RolePermissionIncludeSchema).optional(),
  where: RolePermissionWhereInputSchema.optional(),
  orderBy: z.union([ RolePermissionOrderByWithRelationInputSchema.array(),RolePermissionOrderByWithRelationInputSchema ]).optional(),
  cursor: RolePermissionWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ RolePermissionScalarFieldEnumSchema,RolePermissionScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export default RolePermissionFindFirstArgsSchema;
