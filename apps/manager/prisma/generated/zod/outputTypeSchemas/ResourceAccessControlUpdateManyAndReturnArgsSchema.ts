import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ResourceAccessControlUpdateManyMutationInputSchema } from '../inputTypeSchemas/ResourceAccessControlUpdateManyMutationInputSchema'
import { ResourceAccessControlUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/ResourceAccessControlUncheckedUpdateManyInputSchema'
import { ResourceAccessControlWhereInputSchema } from '../inputTypeSchemas/ResourceAccessControlWhereInputSchema'

export const ResourceAccessControlUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ResourceAccessControlUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ResourceAccessControlUpdateManyMutationInputSchema,ResourceAccessControlUncheckedUpdateManyInputSchema ]),
  where: ResourceAccessControlWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default ResourceAccessControlUpdateManyAndReturnArgsSchema;
