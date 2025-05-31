import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleCreateManyInputSchema } from '../inputTypeSchemas/OrganizationRoleCreateManyInputSchema'

export const OrganizationRoleCreateManyAndReturnArgsSchema: z.ZodType<Prisma.OrganizationRoleCreateManyAndReturnArgs> = z.object({
  data: z.union([ OrganizationRoleCreateManyInputSchema,OrganizationRoleCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default OrganizationRoleCreateManyAndReturnArgsSchema;
