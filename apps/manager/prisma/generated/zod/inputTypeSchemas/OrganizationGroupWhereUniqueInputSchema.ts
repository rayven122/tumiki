import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupOrganizationIdNameCompoundUniqueInputSchema } from './OrganizationGroupOrganizationIdNameCompoundUniqueInputSchema';
import { OrganizationGroupWhereInputSchema } from './OrganizationGroupWhereInputSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { OrganizationScalarRelationFilterSchema } from './OrganizationScalarRelationFilterSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationMemberListRelationFilterSchema } from './OrganizationMemberListRelationFilterSchema';
import { OrganizationRoleListRelationFilterSchema } from './OrganizationRoleListRelationFilterSchema';
import { ResourceAccessControlListRelationFilterSchema } from './ResourceAccessControlListRelationFilterSchema';

export const OrganizationGroupWhereUniqueInputSchema: z.ZodType<Prisma.OrganizationGroupWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    organizationId_name: z.lazy(() => OrganizationGroupOrganizationIdNameCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    organizationId_name: z.lazy(() => OrganizationGroupOrganizationIdNameCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().optional(),
  organizationId_name: z.lazy(() => OrganizationGroupOrganizationIdNameCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => OrganizationGroupWhereInputSchema),z.lazy(() => OrganizationGroupWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrganizationGroupWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrganizationGroupWhereInputSchema),z.lazy(() => OrganizationGroupWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  organizationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  organization: z.union([ z.lazy(() => OrganizationScalarRelationFilterSchema),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  members: z.lazy(() => OrganizationMemberListRelationFilterSchema).optional(),
  roles: z.lazy(() => OrganizationRoleListRelationFilterSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlListRelationFilterSchema).optional()
}).strict());

export default OrganizationGroupWhereUniqueInputSchema;
