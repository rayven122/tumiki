import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { RolePermissionWhereInputSchema } from '../inputTypeSchemas/RolePermissionWhereInputSchema'

export const RolePermissionDeleteManyArgsSchema: z.ZodType<Prisma.RolePermissionDeleteManyArgs> = z.object({
  where: RolePermissionWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default RolePermissionDeleteManyArgsSchema;
