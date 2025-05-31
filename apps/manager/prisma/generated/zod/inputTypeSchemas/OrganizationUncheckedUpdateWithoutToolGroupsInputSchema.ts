import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInputSchema } from './OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInputSchema';
import { OrganizationGroupUncheckedUpdateManyWithoutOrganizationNestedInputSchema } from './OrganizationGroupUncheckedUpdateManyWithoutOrganizationNestedInputSchema';
import { OrganizationRoleUncheckedUpdateManyWithoutOrganizationNestedInputSchema } from './OrganizationRoleUncheckedUpdateManyWithoutOrganizationNestedInputSchema';
import { ResourceAccessControlUncheckedUpdateManyWithoutOrganizationNestedInputSchema } from './ResourceAccessControlUncheckedUpdateManyWithoutOrganizationNestedInputSchema';
import { OrganizationInvitationUncheckedUpdateManyWithoutOrganizationNestedInputSchema } from './OrganizationInvitationUncheckedUpdateManyWithoutOrganizationNestedInputSchema';
import { UserMcpServerConfigUncheckedUpdateManyWithoutOrganizationNestedInputSchema } from './UserMcpServerConfigUncheckedUpdateManyWithoutOrganizationNestedInputSchema';
import { UserMcpServerInstanceUncheckedUpdateManyWithoutOrganizationNestedInputSchema } from './UserMcpServerInstanceUncheckedUpdateManyWithoutOrganizationNestedInputSchema';

export const OrganizationUncheckedUpdateWithoutToolGroupsInputSchema: z.ZodType<Prisma.OrganizationUncheckedUpdateWithoutToolGroupsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  logoUrl: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isDeleted: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdBy: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  members: z.lazy(() => OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleUncheckedUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationUncheckedUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigUncheckedUpdateManyWithoutOrganizationNestedInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceUncheckedUpdateManyWithoutOrganizationNestedInputSchema).optional()
}).strict();

export default OrganizationUncheckedUpdateWithoutToolGroupsInputSchema;
