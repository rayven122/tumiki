import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { EnumServerStatusFilterSchema } from './EnumServerStatusFilterSchema';
import { ServerStatusSchema } from './ServerStatusSchema';
import { EnumServerTypeFilterSchema } from './EnumServerTypeFilterSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { UserMcpServerInstanceToolGroupListRelationFilterSchema } from './UserMcpServerInstanceToolGroupListRelationFilterSchema';
import { UserToolGroupScalarRelationFilterSchema } from './UserToolGroupScalarRelationFilterSchema';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';
import { UserScalarRelationFilterSchema } from './UserScalarRelationFilterSchema';
import { UserWhereInputSchema } from './UserWhereInputSchema';
import { OrganizationNullableScalarRelationFilterSchema } from './OrganizationNullableScalarRelationFilterSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';

export const UserMcpServerInstanceWhereUniqueInputSchema: z.ZodType<Prisma.UserMcpServerInstanceWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    toolGroupId: z.string()
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    toolGroupId: z.string(),
  }),
])
.and(z.object({
  id: z.string().optional(),
  toolGroupId: z.string().optional(),
  AND: z.union([ z.lazy(() => UserMcpServerInstanceWhereInputSchema),z.lazy(() => UserMcpServerInstanceWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserMcpServerInstanceWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserMcpServerInstanceWhereInputSchema),z.lazy(() => UserMcpServerInstanceWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  iconPath: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  serverStatus: z.union([ z.lazy(() => EnumServerStatusFilterSchema),z.lazy(() => ServerStatusSchema) ]).optional(),
  serverType: z.union([ z.lazy(() => EnumServerTypeFilterSchema),z.lazy(() => ServerTypeSchema) ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupListRelationFilterSchema).optional(),
  toolGroup: z.union([ z.lazy(() => UserToolGroupScalarRelationFilterSchema),z.lazy(() => UserToolGroupWhereInputSchema) ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  organization: z.union([ z.lazy(() => OrganizationNullableScalarRelationFilterSchema),z.lazy(() => OrganizationWhereInputSchema) ]).optional().nullable(),
}).strict());

export default UserMcpServerInstanceWhereUniqueInputSchema;
