import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { OrganizationScalarRelationFilterSchema } from './OrganizationScalarRelationFilterSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { RolePermissionListRelationFilterSchema } from './RolePermissionListRelationFilterSchema';
import { OrganizationMemberListRelationFilterSchema } from './OrganizationMemberListRelationFilterSchema';
import { OrganizationGroupListRelationFilterSchema } from './OrganizationGroupListRelationFilterSchema';

export const OrganizationRoleWhereInputSchema: z.ZodType<Prisma.OrganizationRoleWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrganizationRoleWhereInputSchema),z.lazy(() => OrganizationRoleWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrganizationRoleWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrganizationRoleWhereInputSchema),z.lazy(() => OrganizationRoleWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  organizationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isDefault: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  organization: z.union([ z.lazy(() => OrganizationScalarRelationFilterSchema),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  permissions: z.lazy(() => RolePermissionListRelationFilterSchema).optional(),
  members: z.lazy(() => OrganizationMemberListRelationFilterSchema).optional(),
  groups: z.lazy(() => OrganizationGroupListRelationFilterSchema).optional()
}).strict();

export default OrganizationRoleWhereInputSchema;
