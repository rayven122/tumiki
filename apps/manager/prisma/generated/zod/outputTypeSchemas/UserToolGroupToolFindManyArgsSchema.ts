import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupToolIncludeSchema } from '../inputTypeSchemas/UserToolGroupToolIncludeSchema'
import { UserToolGroupToolWhereInputSchema } from '../inputTypeSchemas/UserToolGroupToolWhereInputSchema'
import { UserToolGroupToolOrderByWithRelationInputSchema } from '../inputTypeSchemas/UserToolGroupToolOrderByWithRelationInputSchema'
import { UserToolGroupToolWhereUniqueInputSchema } from '../inputTypeSchemas/UserToolGroupToolWhereUniqueInputSchema'
import { UserToolGroupToolScalarFieldEnumSchema } from '../inputTypeSchemas/UserToolGroupToolScalarFieldEnumSchema'
import { UserMcpServerConfigArgsSchema } from "./UserMcpServerConfigArgsSchema"
import { UserToolGroupArgsSchema } from "./UserToolGroupArgsSchema"
import { ToolArgsSchema } from "./ToolArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const UserToolGroupToolSelectSchema: z.ZodType<Prisma.UserToolGroupToolSelect> = z.object({
  userMcpServerConfigId: z.boolean().optional(),
  toolGroupId: z.boolean().optional(),
  toolId: z.boolean().optional(),
  sortOrder: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  userMcpServerConfig: z.union([z.boolean(),z.lazy(() => UserMcpServerConfigArgsSchema)]).optional(),
  toolGroup: z.union([z.boolean(),z.lazy(() => UserToolGroupArgsSchema)]).optional(),
  tool: z.union([z.boolean(),z.lazy(() => ToolArgsSchema)]).optional(),
}).strict()

export const UserToolGroupToolFindManyArgsSchema: z.ZodType<Prisma.UserToolGroupToolFindManyArgs> = z.object({
  select: UserToolGroupToolSelectSchema.optional(),
  include: z.lazy(() => UserToolGroupToolIncludeSchema).optional(),
  where: UserToolGroupToolWhereInputSchema.optional(),
  orderBy: z.union([ UserToolGroupToolOrderByWithRelationInputSchema.array(),UserToolGroupToolOrderByWithRelationInputSchema ]).optional(),
  cursor: UserToolGroupToolWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserToolGroupToolScalarFieldEnumSchema,UserToolGroupToolScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export default UserToolGroupToolFindManyArgsSchema;
