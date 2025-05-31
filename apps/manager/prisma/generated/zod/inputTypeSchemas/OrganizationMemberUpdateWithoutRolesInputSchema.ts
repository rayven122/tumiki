import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { OrganizationUpdateOneRequiredWithoutMembersNestedInputSchema } from './OrganizationUpdateOneRequiredWithoutMembersNestedInputSchema';
import { UserUpdateOneRequiredWithoutMembersNestedInputSchema } from './UserUpdateOneRequiredWithoutMembersNestedInputSchema';
import { OrganizationGroupUpdateManyWithoutMembersNestedInputSchema } from './OrganizationGroupUpdateManyWithoutMembersNestedInputSchema';
import { ResourceAccessControlUpdateManyWithoutMemberNestedInputSchema } from './ResourceAccessControlUpdateManyWithoutMemberNestedInputSchema';

export const OrganizationMemberUpdateWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateWithoutRolesInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isAdmin: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  organization: z.lazy(() => OrganizationUpdateOneRequiredWithoutMembersNestedInputSchema).optional(),
  user: z.lazy(() => UserUpdateOneRequiredWithoutMembersNestedInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUpdateManyWithoutMembersNestedInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUpdateManyWithoutMemberNestedInputSchema).optional()
}).strict();

export default OrganizationMemberUpdateWithoutRolesInputSchema;
