import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RoleSchema } from './RoleSchema';
import { AccountCreateNestedManyWithoutUserInputSchema } from './AccountCreateNestedManyWithoutUserInputSchema';
import { SessionCreateNestedManyWithoutUserInputSchema } from './SessionCreateNestedManyWithoutUserInputSchema';
import { UserMcpServerConfigCreateNestedManyWithoutUserInputSchema } from './UserMcpServerConfigCreateNestedManyWithoutUserInputSchema';
import { UserMcpServerInstanceCreateNestedManyWithoutUserInputSchema } from './UserMcpServerInstanceCreateNestedManyWithoutUserInputSchema';
import { OrganizationCreateNestedManyWithoutCreatorInputSchema } from './OrganizationCreateNestedManyWithoutCreatorInputSchema';
import { OrganizationMemberCreateNestedManyWithoutUserInputSchema } from './OrganizationMemberCreateNestedManyWithoutUserInputSchema';
import { OrganizationInvitationCreateNestedManyWithoutInvitedByUserInputSchema } from './OrganizationInvitationCreateNestedManyWithoutInvitedByUserInputSchema';

export const UserCreateWithoutToolGroupsInputSchema: z.ZodType<Prisma.UserCreateWithoutToolGroupsInput> = z.object({
  id: z.string().optional(),
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  role: z.lazy(() => RoleSchema).optional(),
  accounts: z.lazy(() => AccountCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionCreateNestedManyWithoutUserInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigCreateNestedManyWithoutUserInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceCreateNestedManyWithoutUserInputSchema).optional(),
  organizations: z.lazy(() => OrganizationCreateNestedManyWithoutCreatorInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberCreateNestedManyWithoutUserInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationCreateNestedManyWithoutInvitedByUserInputSchema).optional()
}).strict();

export default UserCreateWithoutToolGroupsInputSchema;
