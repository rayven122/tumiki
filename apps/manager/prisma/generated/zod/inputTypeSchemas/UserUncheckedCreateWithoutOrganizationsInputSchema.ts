import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RoleSchema } from './RoleSchema';
import { AccountUncheckedCreateNestedManyWithoutUserInputSchema } from './AccountUncheckedCreateNestedManyWithoutUserInputSchema';
import { SessionUncheckedCreateNestedManyWithoutUserInputSchema } from './SessionUncheckedCreateNestedManyWithoutUserInputSchema';
import { UserToolGroupUncheckedCreateNestedManyWithoutUserInputSchema } from './UserToolGroupUncheckedCreateNestedManyWithoutUserInputSchema';
import { UserMcpServerConfigUncheckedCreateNestedManyWithoutUserInputSchema } from './UserMcpServerConfigUncheckedCreateNestedManyWithoutUserInputSchema';
import { UserMcpServerInstanceUncheckedCreateNestedManyWithoutUserInputSchema } from './UserMcpServerInstanceUncheckedCreateNestedManyWithoutUserInputSchema';
import { OrganizationMemberUncheckedCreateNestedManyWithoutUserInputSchema } from './OrganizationMemberUncheckedCreateNestedManyWithoutUserInputSchema';
import { OrganizationInvitationUncheckedCreateNestedManyWithoutInvitedByUserInputSchema } from './OrganizationInvitationUncheckedCreateNestedManyWithoutInvitedByUserInputSchema';

export const UserUncheckedCreateWithoutOrganizationsInputSchema: z.ZodType<Prisma.UserUncheckedCreateWithoutOrganizationsInput> = z.object({
  id: z.string().optional(),
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  emailVerified: z.coerce.date().optional().nullable(),
  image: z.string().optional().nullable(),
  role: z.lazy(() => RoleSchema).optional(),
  accounts: z.lazy(() => AccountUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberUncheckedCreateNestedManyWithoutUserInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationUncheckedCreateNestedManyWithoutInvitedByUserInputSchema).optional()
}).strict();

export default UserUncheckedCreateWithoutOrganizationsInputSchema;
