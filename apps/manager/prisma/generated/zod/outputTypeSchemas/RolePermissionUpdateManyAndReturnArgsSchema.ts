import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { RolePermissionUpdateManyMutationInputSchema } from '../inputTypeSchemas/RolePermissionUpdateManyMutationInputSchema'
import { RolePermissionUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/RolePermissionUncheckedUpdateManyInputSchema'
import { RolePermissionWhereInputSchema } from '../inputTypeSchemas/RolePermissionWhereInputSchema'

export const RolePermissionUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.RolePermissionUpdateManyAndReturnArgs> = z.object({
  data: z.union([ RolePermissionUpdateManyMutationInputSchema,RolePermissionUncheckedUpdateManyInputSchema ]),
  where: RolePermissionWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default RolePermissionUpdateManyAndReturnArgsSchema;
