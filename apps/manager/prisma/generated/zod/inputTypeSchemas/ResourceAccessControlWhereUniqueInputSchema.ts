import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlOrganizationIdResourceTypeResourceIdMemberIdGroupIdCompoundUniqueInputSchema } from './ResourceAccessControlOrganizationIdResourceTypeResourceIdMemberIdGroupIdCompoundUniqueInputSchema';
import { ResourceAccessControlWhereInputSchema } from './ResourceAccessControlWhereInputSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { EnumResourceTypeFilterSchema } from './EnumResourceTypeFilterSchema';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { EnumPermissionActionNullableListFilterSchema } from './EnumPermissionActionNullableListFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { OrganizationScalarRelationFilterSchema } from './OrganizationScalarRelationFilterSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationMemberNullableScalarRelationFilterSchema } from './OrganizationMemberNullableScalarRelationFilterSchema';
import { OrganizationMemberWhereInputSchema } from './OrganizationMemberWhereInputSchema';
import { OrganizationGroupNullableScalarRelationFilterSchema } from './OrganizationGroupNullableScalarRelationFilterSchema';
import { OrganizationGroupWhereInputSchema } from './OrganizationGroupWhereInputSchema';

export const ResourceAccessControlWhereUniqueInputSchema: z.ZodType<Prisma.ResourceAccessControlWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    organizationId_resourceType_resourceId_memberId_groupId: z.lazy(() => ResourceAccessControlOrganizationIdResourceTypeResourceIdMemberIdGroupIdCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    organizationId_resourceType_resourceId_memberId_groupId: z.lazy(() => ResourceAccessControlOrganizationIdResourceTypeResourceIdMemberIdGroupIdCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().optional(),
  organizationId_resourceType_resourceId_memberId_groupId: z.lazy(() => ResourceAccessControlOrganizationIdResourceTypeResourceIdMemberIdGroupIdCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => ResourceAccessControlWhereInputSchema),z.lazy(() => ResourceAccessControlWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ResourceAccessControlWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ResourceAccessControlWhereInputSchema),z.lazy(() => ResourceAccessControlWhereInputSchema).array() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  resourceType: z.union([ z.lazy(() => EnumResourceTypeFilterSchema),z.lazy(() => ResourceTypeSchema) ]).optional(),
  resourceId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  memberId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  groupId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  allowedActions: z.lazy(() => EnumPermissionActionNullableListFilterSchema).optional(),
  deniedActions: z.lazy(() => EnumPermissionActionNullableListFilterSchema).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  organization: z.union([ z.lazy(() => OrganizationScalarRelationFilterSchema),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  member: z.union([ z.lazy(() => OrganizationMemberNullableScalarRelationFilterSchema),z.lazy(() => OrganizationMemberWhereInputSchema) ]).optional().nullable(),
  group: z.union([ z.lazy(() => OrganizationGroupNullableScalarRelationFilterSchema),z.lazy(() => OrganizationGroupWhereInputSchema) ]).optional().nullable(),
}).strict());

export default ResourceAccessControlWhereUniqueInputSchema;
