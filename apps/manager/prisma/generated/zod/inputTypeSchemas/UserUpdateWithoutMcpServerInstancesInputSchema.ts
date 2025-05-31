import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { NullableDateTimeFieldUpdateOperationsInputSchema } from './NullableDateTimeFieldUpdateOperationsInputSchema';
import { RoleSchema } from './RoleSchema';
import { EnumRoleFieldUpdateOperationsInputSchema } from './EnumRoleFieldUpdateOperationsInputSchema';
import { AccountUpdateManyWithoutUserNestedInputSchema } from './AccountUpdateManyWithoutUserNestedInputSchema';
import { SessionUpdateManyWithoutUserNestedInputSchema } from './SessionUpdateManyWithoutUserNestedInputSchema';
import { UserToolGroupUpdateManyWithoutUserNestedInputSchema } from './UserToolGroupUpdateManyWithoutUserNestedInputSchema';
import { UserMcpServerConfigUpdateManyWithoutUserNestedInputSchema } from './UserMcpServerConfigUpdateManyWithoutUserNestedInputSchema';
import { OrganizationUpdateManyWithoutCreatorNestedInputSchema } from './OrganizationUpdateManyWithoutCreatorNestedInputSchema';
import { OrganizationMemberUpdateManyWithoutUserNestedInputSchema } from './OrganizationMemberUpdateManyWithoutUserNestedInputSchema';
import { OrganizationInvitationUpdateManyWithoutInvitedByUserNestedInputSchema } from './OrganizationInvitationUpdateManyWithoutInvitedByUserNestedInputSchema';

export const UserUpdateWithoutMcpServerInstancesInputSchema: z.ZodType<Prisma.UserUpdateWithoutMcpServerInstancesInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUpdateManyWithoutUserNestedInputSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupUpdateManyWithoutUserNestedInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigUpdateManyWithoutUserNestedInputSchema).optional(),
  organizations: z.lazy(() => OrganizationUpdateManyWithoutCreatorNestedInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberUpdateManyWithoutUserNestedInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationUpdateManyWithoutInvitedByUserNestedInputSchema).optional()
}).strict();

export default UserUpdateWithoutMcpServerInstancesInputSchema;
