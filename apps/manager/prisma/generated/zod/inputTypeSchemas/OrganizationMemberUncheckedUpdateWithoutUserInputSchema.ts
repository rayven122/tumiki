import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { OrganizationRoleUncheckedUpdateManyWithoutMembersNestedInputSchema } from './OrganizationRoleUncheckedUpdateManyWithoutMembersNestedInputSchema';
import { OrganizationGroupUncheckedUpdateManyWithoutMembersNestedInputSchema } from './OrganizationGroupUncheckedUpdateManyWithoutMembersNestedInputSchema';
import { ResourceAccessControlUncheckedUpdateManyWithoutMemberNestedInputSchema } from './ResourceAccessControlUncheckedUpdateManyWithoutMemberNestedInputSchema';

export const OrganizationMemberUncheckedUpdateWithoutUserInputSchema: z.ZodType<Prisma.OrganizationMemberUncheckedUpdateWithoutUserInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  organizationId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isAdmin: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  roles: z.lazy(() => OrganizationRoleUncheckedUpdateManyWithoutMembersNestedInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedUpdateManyWithoutMembersNestedInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedUpdateManyWithoutMemberNestedInputSchema).optional()
}).strict();

export default OrganizationMemberUncheckedUpdateWithoutUserInputSchema;
