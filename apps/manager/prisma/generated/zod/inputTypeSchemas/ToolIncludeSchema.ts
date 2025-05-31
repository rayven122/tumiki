import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { McpServerArgsSchema } from "../outputTypeSchemas/McpServerArgsSchema"
import { UserMcpServerConfigFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerConfigFindManyArgsSchema"
import { UserToolGroupToolFindManyArgsSchema } from "../outputTypeSchemas/UserToolGroupToolFindManyArgsSchema"
import { ToolCountOutputTypeArgsSchema } from "../outputTypeSchemas/ToolCountOutputTypeArgsSchema"

export const ToolIncludeSchema: z.ZodType<Prisma.ToolInclude> = z.object({
  mcpServer: z.union([z.boolean(),z.lazy(() => McpServerArgsSchema)]).optional(),
  mcpServerConfigs: z.union([z.boolean(),z.lazy(() => UserMcpServerConfigFindManyArgsSchema)]).optional(),
  toolGroupTools: z.union([z.boolean(),z.lazy(() => UserToolGroupToolFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => ToolCountOutputTypeArgsSchema)]).optional(),
}).strict()

export default ToolIncludeSchema;
