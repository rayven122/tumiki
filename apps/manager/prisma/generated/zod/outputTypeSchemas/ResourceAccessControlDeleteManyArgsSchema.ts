import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ResourceAccessControlWhereInputSchema } from '../inputTypeSchemas/ResourceAccessControlWhereInputSchema'

export const ResourceAccessControlDeleteManyArgsSchema: z.ZodType<Prisma.ResourceAccessControlDeleteManyArgs> = z.object({
  where: ResourceAccessControlWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default ResourceAccessControlDeleteManyArgsSchema;
