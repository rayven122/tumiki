import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { RolePermissionUncheckedUpdateManyWithoutRoleNestedInputSchema } from './RolePermissionUncheckedUpdateManyWithoutRoleNestedInputSchema';
import { OrganizationMemberUncheckedUpdateManyWithoutRolesNestedInputSchema } from './OrganizationMemberUncheckedUpdateManyWithoutRolesNestedInputSchema';

export const OrganizationRoleUncheckedUpdateWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationRoleUncheckedUpdateWithoutGroupsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  organizationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isDefault: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  permissions: z.lazy(() => RolePermissionUncheckedUpdateManyWithoutRoleNestedInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberUncheckedUpdateManyWithoutRolesNestedInputSchema).optional()
}).strict();

export default OrganizationRoleUncheckedUpdateWithoutGroupsInputSchema;
