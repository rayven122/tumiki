import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationOrganizationIdEmailCompoundUniqueInputSchema } from './OrganizationInvitationOrganizationIdEmailCompoundUniqueInputSchema';
import { OrganizationInvitationWhereInputSchema } from './OrganizationInvitationWhereInputSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { StringNullableListFilterSchema } from './StringNullableListFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { OrganizationScalarRelationFilterSchema } from './OrganizationScalarRelationFilterSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { UserScalarRelationFilterSchema } from './UserScalarRelationFilterSchema';
import { UserWhereInputSchema } from './UserWhereInputSchema';

export const OrganizationInvitationWhereUniqueInputSchema: z.ZodType<Prisma.OrganizationInvitationWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    token: z.string(),
    organizationId_email: z.lazy(() => OrganizationInvitationOrganizationIdEmailCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string(),
    token: z.string(),
  }),
  z.object({
    id: z.string(),
    organizationId_email: z.lazy(() => OrganizationInvitationOrganizationIdEmailCompoundUniqueInputSchema),
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    token: z.string(),
    organizationId_email: z.lazy(() => OrganizationInvitationOrganizationIdEmailCompoundUniqueInputSchema),
  }),
  z.object({
    token: z.string(),
  }),
  z.object({
    organizationId_email: z.lazy(() => OrganizationInvitationOrganizationIdEmailCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().optional(),
  token: z.string().optional(),
  organizationId_email: z.lazy(() => OrganizationInvitationOrganizationIdEmailCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => OrganizationInvitationWhereInputSchema),z.lazy(() => OrganizationInvitationWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrganizationInvitationWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrganizationInvitationWhereInputSchema),z.lazy(() => OrganizationInvitationWhereInputSchema).array() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  email: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  invitedBy: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isAdmin: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  roleIds: z.lazy(() => StringNullableListFilterSchema).optional(),
  groupIds: z.lazy(() => StringNullableListFilterSchema).optional(),
  expires: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  organization: z.union([ z.lazy(() => OrganizationScalarRelationFilterSchema),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  invitedByUser: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
}).strict());

export default OrganizationInvitationWhereUniqueInputSchema;
