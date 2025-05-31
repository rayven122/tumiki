import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupCreateManyInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupCreateManyInputSchema'

export const UserMcpServerInstanceToolGroupCreateManyArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateManyArgs> = z.object({
  data: z.union([ UserMcpServerInstanceToolGroupCreateManyInputSchema,UserMcpServerInstanceToolGroupCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default UserMcpServerInstanceToolGroupCreateManyArgsSchema;
