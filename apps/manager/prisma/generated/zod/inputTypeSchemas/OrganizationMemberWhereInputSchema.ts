import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { OrganizationScalarRelationFilterSchema } from './OrganizationScalarRelationFilterSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { UserScalarRelationFilterSchema } from './UserScalarRelationFilterSchema';
import { UserWhereInputSchema } from './UserWhereInputSchema';
import { OrganizationRoleListRelationFilterSchema } from './OrganizationRoleListRelationFilterSchema';
import { OrganizationGroupListRelationFilterSchema } from './OrganizationGroupListRelationFilterSchema';
import { ResourceAccessControlListRelationFilterSchema } from './ResourceAccessControlListRelationFilterSchema';

export const OrganizationMemberWhereInputSchema: z.ZodType<Prisma.OrganizationMemberWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrganizationMemberWhereInputSchema),z.lazy(() => OrganizationMemberWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrganizationMemberWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrganizationMemberWhereInputSchema),z.lazy(() => OrganizationMemberWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isAdmin: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  organization: z.union([ z.lazy(() => OrganizationScalarRelationFilterSchema),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  user: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  roles: z.lazy(() => OrganizationRoleListRelationFilterSchema).optional(),
  groups: z.lazy(() => OrganizationGroupListRelationFilterSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlListRelationFilterSchema).optional()
}).strict();

export default OrganizationMemberWhereInputSchema;
