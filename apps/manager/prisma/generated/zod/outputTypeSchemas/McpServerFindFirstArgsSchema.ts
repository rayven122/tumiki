import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { McpServerIncludeSchema } from '../inputTypeSchemas/McpServerIncludeSchema'
import { McpServerWhereInputSchema } from '../inputTypeSchemas/McpServerWhereInputSchema'
import { McpServerOrderByWithRelationInputSchema } from '../inputTypeSchemas/McpServerOrderByWithRelationInputSchema'
import { McpServerWhereUniqueInputSchema } from '../inputTypeSchemas/McpServerWhereUniqueInputSchema'
import { McpServerScalarFieldEnumSchema } from '../inputTypeSchemas/McpServerScalarFieldEnumSchema'
import { ToolFindManyArgsSchema } from "../outputTypeSchemas/ToolFindManyArgsSchema"
import { UserMcpServerConfigFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerConfigFindManyArgsSchema"
import { McpServerCountOutputTypeArgsSchema } from "../outputTypeSchemas/McpServerCountOutputTypeArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const McpServerSelectSchema: z.ZodType<Prisma.McpServerSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  iconPath: z.boolean().optional(),
  command: z.boolean().optional(),
  args: z.boolean().optional(),
  envVars: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  tools: z.union([z.boolean(),z.lazy(() => ToolFindManyArgsSchema)]).optional(),
  mcpServerConfigs: z.union([z.boolean(),z.lazy(() => UserMcpServerConfigFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => McpServerCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const McpServerFindFirstArgsSchema: z.ZodType<Prisma.McpServerFindFirstArgs> = z.object({
  select: McpServerSelectSchema.optional(),
  include: z.lazy(() => McpServerIncludeSchema).optional(),
  where: McpServerWhereInputSchema.optional(),
  orderBy: z.union([ McpServerOrderByWithRelationInputSchema.array(),McpServerOrderByWithRelationInputSchema ]).optional(),
  cursor: McpServerWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ McpServerScalarFieldEnumSchema,McpServerScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export default McpServerFindFirstArgsSchema;
