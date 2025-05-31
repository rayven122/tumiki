import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { OrganizationUpdateOneRequiredWithoutGroupsNestedInputSchema } from './OrganizationUpdateOneRequiredWithoutGroupsNestedInputSchema';
import { OrganizationMemberUpdateManyWithoutGroupsNestedInputSchema } from './OrganizationMemberUpdateManyWithoutGroupsNestedInputSchema';
import { ResourceAccessControlUpdateManyWithoutGroupNestedInputSchema } from './ResourceAccessControlUpdateManyWithoutGroupNestedInputSchema';

export const OrganizationGroupUpdateWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateWithoutRolesInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  organization: z.lazy(() => OrganizationUpdateOneRequiredWithoutGroupsNestedInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberUpdateManyWithoutGroupsNestedInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUpdateManyWithoutGroupNestedInputSchema).optional()
}).strict();

export default OrganizationGroupUpdateWithoutRolesInputSchema;
