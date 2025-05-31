import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceWhereInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceWhereInputSchema'
import { UserMcpServerInstanceOrderByWithRelationInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceOrderByWithRelationInputSchema'
import { UserMcpServerInstanceWhereUniqueInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceWhereUniqueInputSchema'

export const UserMcpServerInstanceAggregateArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceAggregateArgs> = z.object({
  where: UserMcpServerInstanceWhereInputSchema.optional(),
  orderBy: z.union([ UserMcpServerInstanceOrderByWithRelationInputSchema.array(),UserMcpServerInstanceOrderByWithRelationInputSchema ]).optional(),
  cursor: UserMcpServerInstanceWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default UserMcpServerInstanceAggregateArgsSchema;
