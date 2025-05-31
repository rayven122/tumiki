import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { OrganizationMemberUpdateManyWithoutGroupsNestedInputSchema } from './OrganizationMemberUpdateManyWithoutGroupsNestedInputSchema';
import { OrganizationRoleUpdateManyWithoutGroupsNestedInputSchema } from './OrganizationRoleUpdateManyWithoutGroupsNestedInputSchema';
import { ResourceAccessControlUpdateManyWithoutGroupNestedInputSchema } from './ResourceAccessControlUpdateManyWithoutGroupNestedInputSchema';

export const OrganizationGroupUpdateWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateWithoutOrganizationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  members: z.lazy(() => OrganizationMemberUpdateManyWithoutGroupsNestedInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleUpdateManyWithoutGroupsNestedInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUpdateManyWithoutGroupNestedInputSchema).optional()
}).strict();

export default OrganizationGroupUpdateWithoutOrganizationInputSchema;
