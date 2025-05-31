import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { RolePermissionWhereInputSchema } from '../inputTypeSchemas/RolePermissionWhereInputSchema'
import { RolePermissionOrderByWithAggregationInputSchema } from '../inputTypeSchemas/RolePermissionOrderByWithAggregationInputSchema'
import { RolePermissionScalarFieldEnumSchema } from '../inputTypeSchemas/RolePermissionScalarFieldEnumSchema'
import { RolePermissionScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/RolePermissionScalarWhereWithAggregatesInputSchema'

export const RolePermissionGroupByArgsSchema: z.ZodType<Prisma.RolePermissionGroupByArgs> = z.object({
  where: RolePermissionWhereInputSchema.optional(),
  orderBy: z.union([ RolePermissionOrderByWithAggregationInputSchema.array(),RolePermissionOrderByWithAggregationInputSchema ]).optional(),
  by: RolePermissionScalarFieldEnumSchema.array(),
  having: RolePermissionScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default RolePermissionGroupByArgsSchema;
