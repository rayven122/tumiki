import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { OrganizationUpdateOneRequiredWithoutRolesNestedInputSchema } from './OrganizationUpdateOneRequiredWithoutRolesNestedInputSchema';
import { RolePermissionUpdateManyWithoutRoleNestedInputSchema } from './RolePermissionUpdateManyWithoutRoleNestedInputSchema';
import { OrganizationMemberUpdateManyWithoutRolesNestedInputSchema } from './OrganizationMemberUpdateManyWithoutRolesNestedInputSchema';

export const OrganizationRoleUpdateWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateWithoutGroupsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isDefault: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  organization: z.lazy(() => OrganizationUpdateOneRequiredWithoutRolesNestedInputSchema).optional(),
  permissions: z.lazy(() => RolePermissionUpdateManyWithoutRoleNestedInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberUpdateManyWithoutRolesNestedInputSchema).optional()
}).strict();

export default OrganizationRoleUpdateWithoutGroupsInputSchema;
