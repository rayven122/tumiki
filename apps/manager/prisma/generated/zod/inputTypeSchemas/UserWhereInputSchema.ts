import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { DateTimeNullableFilterSchema } from './DateTimeNullableFilterSchema';
import { EnumRoleFilterSchema } from './EnumRoleFilterSchema';
import { RoleSchema } from './RoleSchema';
import { AccountListRelationFilterSchema } from './AccountListRelationFilterSchema';
import { SessionListRelationFilterSchema } from './SessionListRelationFilterSchema';
import { UserToolGroupListRelationFilterSchema } from './UserToolGroupListRelationFilterSchema';
import { UserMcpServerConfigListRelationFilterSchema } from './UserMcpServerConfigListRelationFilterSchema';
import { UserMcpServerInstanceListRelationFilterSchema } from './UserMcpServerInstanceListRelationFilterSchema';
import { OrganizationListRelationFilterSchema } from './OrganizationListRelationFilterSchema';
import { OrganizationMemberListRelationFilterSchema } from './OrganizationMemberListRelationFilterSchema';
import { OrganizationInvitationListRelationFilterSchema } from './OrganizationInvitationListRelationFilterSchema';

export const UserWhereInputSchema: z.ZodType<Prisma.UserWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserWhereInputSchema),z.lazy(() => UserWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  email: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  emailVerified: z.union([ z.lazy(() => DateTimeNullableFilterSchema),z.coerce.date() ]).optional().nullable(),
  image: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  role: z.union([ z.lazy(() => EnumRoleFilterSchema),z.lazy(() => RoleSchema) ]).optional(),
  accounts: z.lazy(() => AccountListRelationFilterSchema).optional(),
  sessions: z.lazy(() => SessionListRelationFilterSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupListRelationFilterSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigListRelationFilterSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceListRelationFilterSchema).optional(),
  organizations: z.lazy(() => OrganizationListRelationFilterSchema).optional(),
  members: z.lazy(() => OrganizationMemberListRelationFilterSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationListRelationFilterSchema).optional()
}).strict();

export default UserWhereInputSchema;
