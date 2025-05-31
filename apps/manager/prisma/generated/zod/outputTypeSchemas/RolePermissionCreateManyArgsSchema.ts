import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { RolePermissionCreateManyInputSchema } from '../inputTypeSchemas/RolePermissionCreateManyInputSchema'

export const RolePermissionCreateManyArgsSchema: z.ZodType<Prisma.RolePermissionCreateManyArgs> = z.object({
  data: z.union([ RolePermissionCreateManyInputSchema,RolePermissionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default RolePermissionCreateManyArgsSchema;
