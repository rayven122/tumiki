import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationGroupCreateManyInputSchema } from '../inputTypeSchemas/OrganizationGroupCreateManyInputSchema'

export const OrganizationGroupCreateManyArgsSchema: z.ZodType<Prisma.OrganizationGroupCreateManyArgs> = z.object({
  data: z.union([ OrganizationGroupCreateManyInputSchema,OrganizationGroupCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default OrganizationGroupCreateManyArgsSchema;
