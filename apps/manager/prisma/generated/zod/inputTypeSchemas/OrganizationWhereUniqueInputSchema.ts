import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { UserScalarRelationFilterSchema } from './UserScalarRelationFilterSchema';
import { UserWhereInputSchema } from './UserWhereInputSchema';
import { OrganizationMemberListRelationFilterSchema } from './OrganizationMemberListRelationFilterSchema';
import { OrganizationGroupListRelationFilterSchema } from './OrganizationGroupListRelationFilterSchema';
import { OrganizationRoleListRelationFilterSchema } from './OrganizationRoleListRelationFilterSchema';
import { ResourceAccessControlListRelationFilterSchema } from './ResourceAccessControlListRelationFilterSchema';
import { OrganizationInvitationListRelationFilterSchema } from './OrganizationInvitationListRelationFilterSchema';
import { UserToolGroupListRelationFilterSchema } from './UserToolGroupListRelationFilterSchema';
import { UserMcpServerConfigListRelationFilterSchema } from './UserMcpServerConfigListRelationFilterSchema';
import { UserMcpServerInstanceListRelationFilterSchema } from './UserMcpServerInstanceListRelationFilterSchema';

export const OrganizationWhereUniqueInputSchema: z.ZodType<Prisma.OrganizationWhereUniqueInput> = z.object({
  id: z.string()
})
.and(z.object({
  id: z.string().optional(),
  AND: z.union([ z.lazy(() => OrganizationWhereInputSchema),z.lazy(() => OrganizationWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrganizationWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrganizationWhereInputSchema),z.lazy(() => OrganizationWhereInputSchema).array() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  logoUrl: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  isDeleted: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdBy: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  creator: z.union([ z.lazy(() => UserScalarRelationFilterSchema),z.lazy(() => UserWhereInputSchema) ]).optional(),
  members: z.lazy(() => OrganizationMemberListRelationFilterSchema).optional(),
  groups: z.lazy(() => OrganizationGroupListRelationFilterSchema).optional(),
  roles: z.lazy(() => OrganizationRoleListRelationFilterSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlListRelationFilterSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationListRelationFilterSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupListRelationFilterSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigListRelationFilterSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceListRelationFilterSchema).optional()
}).strict());

export default OrganizationWhereUniqueInputSchema;
