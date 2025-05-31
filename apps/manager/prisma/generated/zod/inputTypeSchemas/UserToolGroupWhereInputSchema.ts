import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { UserMcpServerInstanceNullableScalarRelationFilterSchema } from './UserMcpServerInstanceNullableScalarRelationFilterSchema';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';
import { UserScalarRelationFilterSchema } from './UserScalarRelationFilterSchema';
import { UserWhereInputSchema } from './UserWhereInputSchema';
import { UserToolGroupToolListRelationFilterSchema } from './UserToolGroupToolListRelationFilterSchema';
import { OrganizationNullableScalarRelationFilterSchema } from './OrganizationNullableScalarRelationFilterSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { UserMcpServerInstanceToolGroupListRelationFilterSchema } from './UserMcpServerInstanceToolGroupListRelationFilterSchema';

export const UserToolGroupWhereInputSchema: z.ZodType<Prisma.UserToolGroupWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserToolGroupWhereInputSchema),z.lazy(() => UserToolGroupWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserToolGroupWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserToolGroupWhereInputSchema),z.lazy(() => UserToolGroupWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isEnabled: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  mcpServerInstance: z.union([ z.lazy(() => UserMcpServerInstanceNullableScalarRelationFilterSchema),z.lazy(() => UserMcpServerInstanceWhereInputSchema) ]).optional().nullable(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolListRelationFilterSchema).optional(),
  organization: z.union([ z.lazy(() => OrganizationNullableScalarRelationFilterSchema),z.lazy(() => OrganizationWhereInputSchema) ]).optional().nullable(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupListRelationFilterSchema).optional()
}).strict();

export default UserToolGroupWhereInputSchema;
