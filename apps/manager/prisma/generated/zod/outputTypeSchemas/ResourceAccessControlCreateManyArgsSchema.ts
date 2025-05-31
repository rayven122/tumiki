import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ResourceAccessControlCreateManyInputSchema } from '../inputTypeSchemas/ResourceAccessControlCreateManyInputSchema'

export const ResourceAccessControlCreateManyArgsSchema: z.ZodType<Prisma.ResourceAccessControlCreateManyArgs> = z.object({
  data: z.union([ ResourceAccessControlCreateManyInputSchema,ResourceAccessControlCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default ResourceAccessControlCreateManyArgsSchema;
