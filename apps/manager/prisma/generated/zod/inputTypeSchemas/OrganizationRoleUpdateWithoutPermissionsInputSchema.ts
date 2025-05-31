import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { OrganizationUpdateOneRequiredWithoutRolesNestedInputSchema } from './OrganizationUpdateOneRequiredWithoutRolesNestedInputSchema';
import { OrganizationMemberUpdateManyWithoutRolesNestedInputSchema } from './OrganizationMemberUpdateManyWithoutRolesNestedInputSchema';
import { OrganizationGroupUpdateManyWithoutRolesNestedInputSchema } from './OrganizationGroupUpdateManyWithoutRolesNestedInputSchema';

export const OrganizationRoleUpdateWithoutPermissionsInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateWithoutPermissionsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  isDefault: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  organization: z.lazy(() => OrganizationUpdateOneRequiredWithoutRolesNestedInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberUpdateManyWithoutRolesNestedInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUpdateManyWithoutRolesNestedInputSchema).optional()
}).strict();

export default OrganizationRoleUpdateWithoutPermissionsInputSchema;
