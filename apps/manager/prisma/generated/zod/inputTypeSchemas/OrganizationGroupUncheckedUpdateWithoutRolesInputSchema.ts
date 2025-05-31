import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { OrganizationMemberUncheckedUpdateManyWithoutGroupsNestedInputSchema } from './OrganizationMemberUncheckedUpdateManyWithoutGroupsNestedInputSchema';
import { ResourceAccessControlUncheckedUpdateManyWithoutGroupNestedInputSchema } from './ResourceAccessControlUncheckedUpdateManyWithoutGroupNestedInputSchema';

export const OrganizationGroupUncheckedUpdateWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationGroupUncheckedUpdateWithoutRolesInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  organizationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  members: z.lazy(() => OrganizationMemberUncheckedUpdateManyWithoutGroupsNestedInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedUpdateManyWithoutGroupNestedInputSchema).optional()
}).strict();

export default OrganizationGroupUncheckedUpdateWithoutRolesInputSchema;
