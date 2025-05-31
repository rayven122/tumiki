import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigCreateManyInputSchema } from '../inputTypeSchemas/UserMcpServerConfigCreateManyInputSchema'

export const UserMcpServerConfigCreateManyArgsSchema: z.ZodType<Prisma.UserMcpServerConfigCreateManyArgs> = z.object({
  data: z.union([ UserMcpServerConfigCreateManyInputSchema,UserMcpServerConfigCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default UserMcpServerConfigCreateManyArgsSchema;
