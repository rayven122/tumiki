import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigCreateManyInputSchema } from '../inputTypeSchemas/UserMcpServerConfigCreateManyInputSchema'

export const UserMcpServerConfigCreateManyAndReturnArgsSchema: z.ZodType<Prisma.UserMcpServerConfigCreateManyAndReturnArgs> = z.object({
  data: z.union([ UserMcpServerConfigCreateManyInputSchema,UserMcpServerConfigCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default UserMcpServerConfigCreateManyAndReturnArgsSchema;
