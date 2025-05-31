import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './OrganizationGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { OrganizationRoleUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './OrganizationRoleUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { ResourceAccessControlUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './ResourceAccessControlUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { OrganizationInvitationUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './OrganizationInvitationUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { UserToolGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './UserToolGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { UserMcpServerConfigUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './UserMcpServerConfigUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { UserMcpServerInstanceUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './UserMcpServerInstanceUncheckedCreateNestedManyWithoutOrganizationInputSchema';

export const OrganizationUncheckedCreateWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationUncheckedCreateWithoutMembersInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional()
}).strict();

export default OrganizationUncheckedCreateWithoutMembersInputSchema;
