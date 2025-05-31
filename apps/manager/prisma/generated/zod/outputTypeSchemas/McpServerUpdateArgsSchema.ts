import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { McpServerIncludeSchema } from '../inputTypeSchemas/McpServerIncludeSchema'
import { McpServerUpdateInputSchema } from '../inputTypeSchemas/McpServerUpdateInputSchema'
import { McpServerUncheckedUpdateInputSchema } from '../inputTypeSchemas/McpServerUncheckedUpdateInputSchema'
import { McpServerWhereUniqueInputSchema } from '../inputTypeSchemas/McpServerWhereUniqueInputSchema'
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

export const McpServerUpdateArgsSchema: z.ZodType<Prisma.McpServerUpdateArgs> = z.object({
  select: McpServerSelectSchema.optional(),
  include: z.lazy(() => McpServerIncludeSchema).optional(),
  data: z.union([ McpServerUpdateInputSchema,McpServerUncheckedUpdateInputSchema ]),
  where: McpServerWhereUniqueInputSchema,
}).strict() ;

export default McpServerUpdateArgsSchema;
