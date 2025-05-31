import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupWhereInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupWhereInputSchema'
import { UserMcpServerInstanceToolGroupOrderByWithRelationInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupOrderByWithRelationInputSchema'
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupWhereUniqueInputSchema'

export const UserMcpServerInstanceToolGroupAggregateArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupAggregateArgs> = z.object({
  where: UserMcpServerInstanceToolGroupWhereInputSchema.optional(),
  orderBy: z.union([ UserMcpServerInstanceToolGroupOrderByWithRelationInputSchema.array(),UserMcpServerInstanceToolGroupOrderByWithRelationInputSchema ]).optional(),
  cursor: UserMcpServerInstanceToolGroupWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default UserMcpServerInstanceToolGroupAggregateArgsSchema;
