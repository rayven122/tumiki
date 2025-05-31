import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupToolCreateManyInputSchema } from '../inputTypeSchemas/UserToolGroupToolCreateManyInputSchema'

export const UserToolGroupToolCreateManyAndReturnArgsSchema: z.ZodType<Prisma.UserToolGroupToolCreateManyAndReturnArgs> = z.object({
  data: z.union([ UserToolGroupToolCreateManyInputSchema,UserToolGroupToolCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default UserToolGroupToolCreateManyAndReturnArgsSchema;
