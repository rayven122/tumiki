import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleUpdateManyMutationInputSchema } from '../inputTypeSchemas/OrganizationRoleUpdateManyMutationInputSchema'
import { OrganizationRoleUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/OrganizationRoleUncheckedUpdateManyInputSchema'
import { OrganizationRoleWhereInputSchema } from '../inputTypeSchemas/OrganizationRoleWhereInputSchema'

export const OrganizationRoleUpdateManyArgsSchema: z.ZodType<Prisma.OrganizationRoleUpdateManyArgs> = z.object({
  data: z.union([ OrganizationRoleUpdateManyMutationInputSchema,OrganizationRoleUncheckedUpdateManyInputSchema ]),
  where: OrganizationRoleWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default OrganizationRoleUpdateManyArgsSchema;
