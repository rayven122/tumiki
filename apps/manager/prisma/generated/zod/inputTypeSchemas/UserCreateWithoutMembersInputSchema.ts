import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RoleSchema } from './RoleSchema';
import { AccountCreateNestedManyWithoutUserInputSchema } from './AccountCreateNestedManyWithoutUserInputSchema';
import { SessionCreateNestedManyWithoutUserInputSchema } from './SessionCreateNestedManyWithoutUserInputSchema';
import { UserToolGroupCreateNestedManyWithoutUserInputSchema } from './UserToolGroupCreateNestedManyWithoutUserInputSchema';
import { UserMcpServerConfigCreateNestedManyWithoutUserInputSchema } from './UserMcpServerConfigCreateNestedManyWithoutUserInputSchema';
import { UserMcpServerInstanceCreateNestedManyWithoutUserInputSchema } from './UserMcpServerInstanceCreateNestedManyWithoutUserInputSchema';
import { OrganizationCreateNestedManyWithoutCreatorInputSchema } from './OrganizationCreateNestedManyWithoutCreatorInputSchema';
import { OrganizationInvitationCreateNestedManyWithoutInvitedByUserInputSchema } from './OrganizationInvitationCreateNestedManyWithoutInvitedByUserInputSchema';

export const UserCreateWithoutMembersInputSchema: z.ZodType<Prisma.UserCreateWithoutMembersInput> = z.object({
  id: z.string().optional(),
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  role: z.lazy(() => RoleSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupCreateNestedManyWithoutUserInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigCreateNestedManyWithoutUserInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceCreateNestedManyWithoutUserInputSchema).optional(),
  organizations: z.lazy(() => OrganizationCreateNestedManyWithoutCreatorInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationCreateNestedManyWithoutInvitedByUserInputSchema).optional()
}).strict();

export default UserCreateWithoutMembersInputSchema;
