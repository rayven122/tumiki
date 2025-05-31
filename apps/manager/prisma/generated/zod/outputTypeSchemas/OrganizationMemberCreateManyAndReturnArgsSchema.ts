import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationMemberCreateManyInputSchema } from '../inputTypeSchemas/OrganizationMemberCreateManyInputSchema'

export const OrganizationMemberCreateManyAndReturnArgsSchema: z.ZodType<Prisma.OrganizationMemberCreateManyAndReturnArgs> = z.object({
  data: z.union([ OrganizationMemberCreateManyInputSchema,OrganizationMemberCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default OrganizationMemberCreateManyAndReturnArgsSchema;
