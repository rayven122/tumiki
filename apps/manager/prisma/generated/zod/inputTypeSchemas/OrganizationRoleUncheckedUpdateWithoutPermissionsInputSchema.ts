import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { OrganizationMemberUncheckedUpdateManyWithoutRolesNestedInputSchema } from './OrganizationMemberUncheckedUpdateManyWithoutRolesNestedInputSchema';
import { OrganizationGroupUncheckedUpdateManyWithoutRolesNestedInputSchema } from './OrganizationGroupUncheckedUpdateManyWithoutRolesNestedInputSchema';

export const OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema: z.ZodType<Prisma.OrganizationRoleUncheckedUpdateWithoutPermissionsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  organizationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isDefault: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  members: z.lazy(() => OrganizationMemberUncheckedUpdateManyWithoutRolesNestedInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedUpdateManyWithoutRolesNestedInputSchema).optional()
}).strict();

export default OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema;
