import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolIncludeSchema } from '../inputTypeSchemas/ToolIncludeSchema'
import { ToolWhereUniqueInputSchema } from '../inputTypeSchemas/ToolWhereUniqueInputSchema'
import { McpServerArgsSchema } from "./McpServerArgsSchema"
import { UserMcpServerConfigFindManyArgsSchema } from "./UserMcpServerConfigFindManyArgsSchema"
import { UserToolGroupToolFindManyArgsSchema } from "./UserToolGroupToolFindManyArgsSchema"
import { ToolCountOutputTypeArgsSchema } from "./ToolCountOutputTypeArgsSchema"
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

export const ToolDeleteArgsSchema: z.ZodType<Prisma.ToolDeleteArgs> = z.object({
  select: ToolSelectSchema.optional(),
  include: z.lazy(() => ToolIncludeSchema).optional(),
  where: ToolWhereUniqueInputSchema,
}).strict() ;

export default ToolDeleteArgsSchema;
