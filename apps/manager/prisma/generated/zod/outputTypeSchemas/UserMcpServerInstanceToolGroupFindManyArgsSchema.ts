import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupIncludeSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupIncludeSchema'
import { UserMcpServerInstanceToolGroupWhereInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupWhereInputSchema'
import { UserMcpServerInstanceToolGroupOrderByWithRelationInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupOrderByWithRelationInputSchema'
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupWhereUniqueInputSchema'
import { UserMcpServerInstanceToolGroupScalarFieldEnumSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupScalarFieldEnumSchema'
import { UserMcpServerInstanceArgsSchema } from "./UserMcpServerInstanceArgsSchema"
import { UserToolGroupArgsSchema } from "./UserToolGroupArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const UserMcpServerInstanceToolGroupSelectSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupSelect> = z.object({
  mcpServerInstanceId: z.boolean().optional(),
  toolGroupId: z.boolean().optional(),
  sortOrder: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  mcpServerInstance: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceArgsSchema)]).optional(),
  toolGroup: z.union([z.boolean(),z.lazy(() => UserToolGroupArgsSchema)]).optional(),
}).strict()

export const UserMcpServerInstanceToolGroupFindManyArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupFindManyArgs> = z.object({
  select: UserMcpServerInstanceToolGroupSelectSchema.optional(),
  include: z.lazy(() => UserMcpServerInstanceToolGroupIncludeSchema).optional(),
  where: UserMcpServerInstanceToolGroupWhereInputSchema.optional(),
  orderBy: z.union([ UserMcpServerInstanceToolGroupOrderByWithRelationInputSchema.array(),UserMcpServerInstanceToolGroupOrderByWithRelationInputSchema ]).optional(),
  cursor: UserMcpServerInstanceToolGroupWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserMcpServerInstanceToolGroupScalarFieldEnumSchema,UserMcpServerInstanceToolGroupScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export default UserMcpServerInstanceToolGroupFindManyArgsSchema;
