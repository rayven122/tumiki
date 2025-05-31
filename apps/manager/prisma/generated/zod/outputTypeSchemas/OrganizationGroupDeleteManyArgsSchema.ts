import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationGroupWhereInputSchema } from '../inputTypeSchemas/OrganizationGroupWhereInputSchema'

export const OrganizationGroupDeleteManyArgsSchema: z.ZodType<Prisma.OrganizationGroupDeleteManyArgs> = z.object({
  where: OrganizationGroupWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default OrganizationGroupDeleteManyArgsSchema;
