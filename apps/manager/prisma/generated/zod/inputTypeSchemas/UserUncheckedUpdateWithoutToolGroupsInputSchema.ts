import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { NullableDateTimeFieldUpdateOperationsInputSchema } from './NullableDateTimeFieldUpdateOperationsInputSchema';
import { RoleSchema } from './RoleSchema';
import { EnumRoleFieldUpdateOperationsInputSchema } from './EnumRoleFieldUpdateOperationsInputSchema';
import { AccountUncheckedUpdateManyWithoutUserNestedInputSchema } from './AccountUncheckedUpdateManyWithoutUserNestedInputSchema';
import { SessionUncheckedUpdateManyWithoutUserNestedInputSchema } from './SessionUncheckedUpdateManyWithoutUserNestedInputSchema';
import { UserMcpServerConfigUncheckedUpdateManyWithoutUserNestedInputSchema } from './UserMcpServerConfigUncheckedUpdateManyWithoutUserNestedInputSchema';
import { UserMcpServerInstanceUncheckedUpdateManyWithoutUserNestedInputSchema } from './UserMcpServerInstanceUncheckedUpdateManyWithoutUserNestedInputSchema';
import { OrganizationUncheckedUpdateManyWithoutCreatorNestedInputSchema } from './OrganizationUncheckedUpdateManyWithoutCreatorNestedInputSchema';
import { OrganizationMemberUncheckedUpdateManyWithoutUserNestedInputSchema } from './OrganizationMemberUncheckedUpdateManyWithoutUserNestedInputSchema';
import { OrganizationInvitationUncheckedUpdateManyWithoutInvitedByUserNestedInputSchema } from './OrganizationInvitationUncheckedUpdateManyWithoutInvitedByUserNestedInputSchema';

export const UserUncheckedUpdateWithoutToolGroupsInputSchema: z.ZodType<Prisma.UserUncheckedUpdateWithoutToolGroupsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  email: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  emailVerified: z.union([ z.coerce.date(),z.lazy(() => NullableDateTimeFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  image: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  role: z.union([ z.lazy(() => RoleSchema),z.lazy(() => EnumRoleFieldUpdateOperationsInputSchema) ]).optional(),
  accounts: z.lazy(() => AccountUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  sessions: z.lazy(() => SessionUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  organizations: z.lazy(() => OrganizationUncheckedUpdateManyWithoutCreatorNestedInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberUncheckedUpdateManyWithoutUserNestedInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationUncheckedUpdateManyWithoutInvitedByUserNestedInputSchema).optional()
}).strict();

export default UserUncheckedUpdateWithoutToolGroupsInputSchema;
