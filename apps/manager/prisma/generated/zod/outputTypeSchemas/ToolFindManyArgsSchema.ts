import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolIncludeSchema } from '../inputTypeSchemas/ToolIncludeSchema'
import { ToolWhereInputSchema } from '../inputTypeSchemas/ToolWhereInputSchema'
import { ToolOrderByWithRelationInputSchema } from '../inputTypeSchemas/ToolOrderByWithRelationInputSchema'
import { ToolWhereUniqueInputSchema } from '../inputTypeSchemas/ToolWhereUniqueInputSchema'
import { ToolScalarFieldEnumSchema } from '../inputTypeSchemas/ToolScalarFieldEnumSchema'
import { McpServerArgsSchema } from "../outputTypeSchemas/McpServerArgsSchema"
import { UserMcpServerConfigFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerConfigFindManyArgsSchema"
import { UserToolGroupToolFindManyArgsSchema } from "../outputTypeSchemas/UserToolGroupToolFindManyArgsSchema"
import { ToolCountOutputTypeArgsSchema } from "../outputTypeSchemas/ToolCountOutputTypeArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const ToolSelectSchema: z.ZodType<Prisma.ToolSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  description: z.boolean().optional(),
  inputSchema: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  mcpServerId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  mcpServer: z.union([z.boolean(),z.lazy(() => McpServerArgsSchema)]).optional(),
  mcpServerConfigs: z.union([z.boolean(),z.lazy(() => UserMcpServerConfigFindManyArgsSchema)]).optional(),
  toolGroupTools: z.union([z.boolean(),z.lazy(() => UserToolGroupToolFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ToolCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const ToolFindManyArgsSchema: z.ZodType<Prisma.ToolFindManyArgs> = z.object({
  select: ToolSelectSchema.optional(),
  include: z.lazy(() => ToolIncludeSchema).optional(),
  where: ToolWhereInputSchema.optional(),
  orderBy: z.union([ ToolOrderByWithRelationInputSchema.array(),ToolOrderByWithRelationInputSchema ]).optional(),
  cursor: ToolWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ ToolScalarFieldEnumSchema,ToolScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export default ToolFindManyArgsSchema;
