import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigIncludeSchema } from '../inputTypeSchemas/UserMcpServerConfigIncludeSchema'
import { UserMcpServerConfigCreateInputSchema } from '../inputTypeSchemas/UserMcpServerConfigCreateInputSchema'
import { UserMcpServerConfigUncheckedCreateInputSchema } from '../inputTypeSchemas/UserMcpServerConfigUncheckedCreateInputSchema'
import { ToolFindManyArgsSchema } from "../outputTypeSchemas/ToolFindManyArgsSchema"
import { UserToolGroupToolFindManyArgsSchema } from "../outputTypeSchemas/UserToolGroupToolFindManyArgsSchema"
import { McpServerArgsSchema } from "../outputTypeSchemas/McpServerArgsSchema"
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { UserMcpServerConfigCountOutputTypeArgsSchema } from "../outputTypeSchemas/UserMcpServerConfigCountOutputTypeArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const UserMcpServerConfigSelectSchema: z.ZodType<Prisma.UserMcpServerConfigSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  description: z.boolean().optional(),
  envVars: z.boolean().optional(),
  mcpServerId: z.boolean().optional(),
  userId: z.boolean().optional(),
  organizationId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  tools: z.union([z.boolean(),z.lazy(() => ToolFindManyArgsSchema)]).optional(),
  userToolGroupTools: z.union([z.boolean(),z.lazy(() => UserToolGroupToolFindManyArgsSchema)]).optional(),
  mcpServer: z.union([z.boolean(),z.lazy(() => McpServerArgsSchema)]).optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserMcpServerConfigCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const UserMcpServerConfigCreateArgsSchema: z.ZodType<Prisma.UserMcpServerConfigCreateArgs> = z.object({
  select: UserMcpServerConfigSelectSchema.optional(),
  include: z.lazy(() => UserMcpServerConfigIncludeSchema).optional(),
  data: z.union([ UserMcpServerConfigCreateInputSchema,UserMcpServerConfigUncheckedCreateInputSchema ]),
}).strict() ;

export default UserMcpServerConfigCreateArgsSchema;
