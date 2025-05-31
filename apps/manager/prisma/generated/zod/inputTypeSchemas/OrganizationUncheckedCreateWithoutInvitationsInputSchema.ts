import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './OrganizationMemberUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { OrganizationGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './OrganizationGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { OrganizationRoleUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './OrganizationRoleUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { ResourceAccessControlUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './ResourceAccessControlUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { UserToolGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './UserToolGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { UserMcpServerConfigUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './UserMcpServerConfigUncheckedCreateNestedManyWithoutOrganizationInputSchema';
import { UserMcpServerInstanceUncheckedCreateNestedManyWithoutOrganizationInputSchema } from './UserMcpServerInstanceUncheckedCreateNestedManyWithoutOrganizationInputSchema';

export const OrganizationUncheckedCreateWithoutInvitationsInputSchema: z.ZodType<Prisma.OrganizationUncheckedCreateWithoutInvitationsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  isDeleted: z.boolean().optional(),
  createdBy: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  members: z.lazy(() => OrganizationMemberUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceUncheckedCreateNestedManyWithoutOrganizationInputSchema).optional()
}).strict();

export default OrganizationUncheckedCreateWithoutInvitationsInputSchema;
