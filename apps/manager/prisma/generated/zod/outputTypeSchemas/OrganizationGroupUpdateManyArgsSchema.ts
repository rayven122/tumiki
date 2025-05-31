import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationGroupUpdateManyMutationInputSchema } from '../inputTypeSchemas/OrganizationGroupUpdateManyMutationInputSchema'
import { OrganizationGroupUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/OrganizationGroupUncheckedUpdateManyInputSchema'
import { OrganizationGroupWhereInputSchema } from '../inputTypeSchemas/OrganizationGroupWhereInputSchema'

export const OrganizationGroupUpdateManyArgsSchema: z.ZodType<Prisma.OrganizationGroupUpdateManyArgs> = z.object({
  data: z.union([ OrganizationGroupUpdateManyMutationInputSchema,OrganizationGroupUncheckedUpdateManyInputSchema ]),
  where: OrganizationGroupWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default OrganizationGroupUpdateManyArgsSchema;
