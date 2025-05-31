import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { OrganizationScalarRelationFilterSchema } from './OrganizationScalarRelationFilterSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationMemberListRelationFilterSchema } from './OrganizationMemberListRelationFilterSchema';
import { OrganizationRoleListRelationFilterSchema } from './OrganizationRoleListRelationFilterSchema';
import { ResourceAccessControlListRelationFilterSchema } from './ResourceAccessControlListRelationFilterSchema';

export const OrganizationGroupWhereInputSchema: z.ZodType<Prisma.OrganizationGroupWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrganizationGroupWhereInputSchema),z.lazy(() => OrganizationGroupWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrganizationGroupWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrganizationGroupWhereInputSchema),z.lazy(() => OrganizationGroupWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  organizationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  organization: z.union([ z.lazy(() => OrganizationScalarRelationFilterSchema),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  members: z.lazy(() => OrganizationMemberListRelationFilterSchema).optional(),
  roles: z.lazy(() => OrganizationRoleListRelationFilterSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlListRelationFilterSchema).optional()
}).strict();

export default OrganizationGroupWhereInputSchema;
