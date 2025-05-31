import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceCreateManyInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceCreateManyInputSchema'

export const UserMcpServerInstanceCreateManyAndReturnArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateManyAndReturnArgs> = z.object({
  data: z.union([ UserMcpServerInstanceCreateManyInputSchema,UserMcpServerInstanceCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default UserMcpServerInstanceCreateManyAndReturnArgsSchema;
