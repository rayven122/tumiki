import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { RolePermissionCreateManyInputSchema } from '../inputTypeSchemas/RolePermissionCreateManyInputSchema'

export const RolePermissionCreateManyAndReturnArgsSchema: z.ZodType<Prisma.RolePermissionCreateManyAndReturnArgs> = z.object({
  data: z.union([ RolePermissionCreateManyInputSchema,RolePermissionCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default RolePermissionCreateManyAndReturnArgsSchema;
