import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserUpdateOneRequiredWithoutOrganizationsNestedInputSchema } from './UserUpdateOneRequiredWithoutOrganizationsNestedInputSchema';
import { OrganizationMemberUpdateManyWithoutOrganizationNestedInputSchema } from './OrganizationMemberUpdateManyWithoutOrganizationNestedInputSchema';
import { OrganizationGroupUpdateManyWithoutOrganizationNestedInputSchema } from './OrganizationGroupUpdateManyWithoutOrganizationNestedInputSchema';
import { OrganizationRoleUpdateManyWithoutOrganizationNestedInputSchema } from './OrganizationRoleUpdateManyWithoutOrganizationNestedInputSchema';
import { OrganizationInvitationUpdateManyWithoutOrganizationNestedInputSchema } from './OrganizationInvitationUpdateManyWithoutOrganizationNestedInputSchema';
import { UserToolGroupUpdateManyWithoutOrganizationNestedInputSchema } from './UserToolGroupUpdateManyWithoutOrganizationNestedInputSchema';
import { UserMcpServerConfigUpdateManyWithoutOrganizationNestedInputSchema } from './UserMcpServerConfigUpdateManyWithoutOrganizationNestedInputSchema';
import { UserMcpServerInstanceUpdateManyWithoutOrganizationNestedInputSchema } from './UserMcpServerInstanceUpdateManyWithoutOrganizationNestedInputSchema';

export const OrganizationUpdateWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationUpdateWithoutResourceAclsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  creator: z.lazy(() => UserUpdateOneRequiredWithoutOrganizationsNestedInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceUpdateManyWithoutOrganizationNestedInputSchema).optional()
}).strict();

export default OrganizationUpdateWithoutResourceAclsInputSchema;
