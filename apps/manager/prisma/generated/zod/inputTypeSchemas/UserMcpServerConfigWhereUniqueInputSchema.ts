import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigUserIdMcpServerIdNameCompoundUniqueInputSchema } from './UserMcpServerConfigUserIdMcpServerIdNameCompoundUniqueInputSchema';
import { UserMcpServerConfigWhereInputSchema } from './UserMcpServerConfigWhereInputSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { ToolListRelationFilterSchema } from './ToolListRelationFilterSchema';
import { UserToolGroupToolListRelationFilterSchema } from './UserToolGroupToolListRelationFilterSchema';
import { McpServerScalarRelationFilterSchema } from './McpServerScalarRelationFilterSchema';
import { McpServerWhereInputSchema } from './McpServerWhereInputSchema';
import { UserScalarRelationFilterSchema } from './UserScalarRelationFilterSchema';
import { UserWhereInputSchema } from './UserWhereInputSchema';
import { OrganizationNullableScalarRelationFilterSchema } from './OrganizationNullableScalarRelationFilterSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';

export const UserMcpServerConfigWhereUniqueInputSchema: z.ZodType<Prisma.UserMcpServerConfigWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    userId_mcpServerId_name: z.lazy(() => UserMcpServerConfigUserIdMcpServerIdNameCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    userId_mcpServerId_name: z.lazy(() => UserMcpServerConfigUserIdMcpServerIdNameCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().optional(),
  userId_mcpServerId_name: z.lazy(() => UserMcpServerConfigUserIdMcpServerIdNameCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => UserMcpServerConfigWhereInputSchema),z.lazy(() => UserMcpServerConfigWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserMcpServerConfigWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserMcpServerConfigWhereInputSchema),z.lazy(() => UserMcpServerConfigWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  envVars: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  mcpServerId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  tools: z.lazy(() => ToolListRelationFilterSchema).optional(),
  userToolGroupTools: z.lazy(() => UserToolGroupToolListRelationFilterSchema).optional(),
  mcpServer: z.union([ z.lazy(() => McpServerScalarRelationFilterSchema),z.lazy(() => McpServerWhereInputSchema) ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  organization: z.union([ z.lazy(() => OrganizationNullableScalarRelationFilterSchema),z.lazy(() => OrganizationWhereInputSchema) ]).optional().nullable(),
}).strict());

export default UserMcpServerConfigWhereUniqueInputSchema;
