import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationMemberUpdateManyMutationInputSchema } from '../inputTypeSchemas/OrganizationMemberUpdateManyMutationInputSchema'
import { OrganizationMemberUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/OrganizationMemberUncheckedUpdateManyInputSchema'
import { OrganizationMemberWhereInputSchema } from '../inputTypeSchemas/OrganizationMemberWhereInputSchema'

export const OrganizationMemberUpdateManyArgsSchema: z.ZodType<Prisma.OrganizationMemberUpdateManyArgs> = z.object({
  data: z.union([ OrganizationMemberUpdateManyMutationInputSchema,OrganizationMemberUncheckedUpdateManyInputSchema ]),
  where: OrganizationMemberWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default OrganizationMemberUpdateManyArgsSchema;
