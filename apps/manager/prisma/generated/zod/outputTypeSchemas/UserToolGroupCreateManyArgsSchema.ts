import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupCreateManyInputSchema } from '../inputTypeSchemas/UserToolGroupCreateManyInputSchema'

export const UserToolGroupCreateManyArgsSchema: z.ZodType<Prisma.UserToolGroupCreateManyArgs> = z.object({
  data: z.union([ UserToolGroupCreateManyInputSchema,UserToolGroupCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default UserToolGroupCreateManyArgsSchema;
