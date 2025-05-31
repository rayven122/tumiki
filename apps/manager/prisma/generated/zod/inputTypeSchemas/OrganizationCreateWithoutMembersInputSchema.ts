import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserCreateNestedOneWithoutOrganizationsInputSchema } from './UserCreateNestedOneWithoutOrganizationsInputSchema';
import { OrganizationGroupCreateNestedManyWithoutOrganizationInputSchema } from './OrganizationGroupCreateNestedManyWithoutOrganizationInputSchema';
import { OrganizationRoleCreateNestedManyWithoutOrganizationInputSchema } from './OrganizationRoleCreateNestedManyWithoutOrganizationInputSchema';
import { ResourceAccessControlCreateNestedManyWithoutOrganizationInputSchema } from './ResourceAccessControlCreateNestedManyWithoutOrganizationInputSchema';
import { OrganizationInvitationCreateNestedManyWithoutOrganizationInputSchema } from './OrganizationInvitationCreateNestedManyWithoutOrganizationInputSchema';
import { UserToolGroupCreateNestedManyWithoutOrganizationInputSchema } from './UserToolGroupCreateNestedManyWithoutOrganizationInputSchema';
import { UserMcpServerConfigCreateNestedManyWithoutOrganizationInputSchema } from './UserMcpServerConfigCreateNestedManyWithoutOrganizationInputSchema';
import { UserMcpServerInstanceCreateNestedManyWithoutOrganizationInputSchema } from './UserMcpServerInstanceCreateNestedManyWithoutOrganizationInputSchema';

export const OrganizationCreateWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationCreateWithoutMembersInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  isDeleted: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  creator: z.lazy(() => UserCreateNestedOneWithoutOrganizationsInputSchema),
  groups: z.lazy(() => OrganizationGroupCreateNestedManyWithoutOrganizationInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleCreateNestedManyWithoutOrganizationInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlCreateNestedManyWithoutOrganizationInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationCreateNestedManyWithoutOrganizationInputSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupCreateNestedManyWithoutOrganizationInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigCreateNestedManyWithoutOrganizationInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceCreateNestedManyWithoutOrganizationInputSchema).optional()
}).strict();

export default OrganizationCreateWithoutMembersInputSchema;
