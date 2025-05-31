import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleOrganizationIdNameCompoundUniqueInputSchema } from './OrganizationRoleOrganizationIdNameCompoundUniqueInputSchema';
import { OrganizationRoleWhereInputSchema } from './OrganizationRoleWhereInputSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { OrganizationScalarRelationFilterSchema } from './OrganizationScalarRelationFilterSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { RolePermissionListRelationFilterSchema } from './RolePermissionListRelationFilterSchema';
import { OrganizationMemberListRelationFilterSchema } from './OrganizationMemberListRelationFilterSchema';
import { OrganizationGroupListRelationFilterSchema } from './OrganizationGroupListRelationFilterSchema';

export const OrganizationRoleWhereUniqueInputSchema: z.ZodType<Prisma.OrganizationRoleWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    organizationId_name: z.lazy(() => OrganizationRoleOrganizationIdNameCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    organizationId_name: z.lazy(() => OrganizationRoleOrganizationIdNameCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().optional(),
  organizationId_name: z.lazy(() => OrganizationRoleOrganizationIdNameCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => OrganizationRoleWhereInputSchema),z.lazy(() => OrganizationRoleWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrganizationRoleWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrganizationRoleWhereInputSchema),z.lazy(() => OrganizationRoleWhereInputSchema).array() ]).optional(),
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
}).strict());

export default OrganizationRoleWhereUniqueInputSchema;
