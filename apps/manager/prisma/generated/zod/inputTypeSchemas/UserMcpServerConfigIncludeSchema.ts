import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolFindManyArgsSchema } from "../outputTypeSchemas/ToolFindManyArgsSchema"
import { UserToolGroupToolFindManyArgsSchema } from "../outputTypeSchemas/UserToolGroupToolFindManyArgsSchema"
import { McpServerArgsSchema } from "../outputTypeSchemas/McpServerArgsSchema"
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { UserMcpServerConfigCountOutputTypeArgsSchema } from "../outputTypeSchemas/UserMcpServerConfigCountOutputTypeArgsSchema"

export const UserMcpServerConfigIncludeSchema: z.ZodType<Prisma.UserMcpServerConfigInclude> = z.object({
  tools: z.union([z.boolean(),z.lazy(() => ToolFindManyArgsSchema)]).optional(),
  userToolGroupTools: z.union([z.boolean(),z.lazy(() => UserToolGroupToolFindManyArgsSchema)]).optional(),
  mcpServer: z.union([z.boolean(),z.lazy(() => McpServerArgsSchema)]).optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserMcpServerConfigCountOutputTypeArgsSchema)]).optional(),
}).strict()

export default UserMcpServerConfigIncludeSchema;
