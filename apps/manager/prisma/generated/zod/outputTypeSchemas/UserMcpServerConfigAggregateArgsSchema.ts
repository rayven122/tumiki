import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigWhereInputSchema } from '../inputTypeSchemas/UserMcpServerConfigWhereInputSchema'
import { UserMcpServerConfigOrderByWithRelationInputSchema } from '../inputTypeSchemas/UserMcpServerConfigOrderByWithRelationInputSchema'
import { UserMcpServerConfigWhereUniqueInputSchema } from '../inputTypeSchemas/UserMcpServerConfigWhereUniqueInputSchema'

export const UserMcpServerConfigAggregateArgsSchema: z.ZodType<Prisma.UserMcpServerConfigAggregateArgs> = z.object({
  where: UserMcpServerConfigWhereInputSchema.optional(),
  orderBy: z.union([ UserMcpServerConfigOrderByWithRelationInputSchema.array(),UserMcpServerConfigOrderByWithRelationInputSchema ]).optional(),
  cursor: UserMcpServerConfigWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default UserMcpServerConfigAggregateArgsSchema;
