import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { OrganizationInvitationUpdateroleIdsInputSchema } from './OrganizationInvitationUpdateroleIdsInputSchema';
import { OrganizationInvitationUpdategroupIdsInputSchema } from './OrganizationInvitationUpdategroupIdsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';

export const OrganizationInvitationUpdateManyMutationInputSchema: z.ZodType<Prisma.OrganizationInvitationUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  email: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  token: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isAdmin: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  roleIds: z.union([ z.lazy(() => OrganizationInvitationUpdateroleIdsInputSchema),z.string().array() ]).optional(),
  groupIds: z.union([ z.lazy(() => OrganizationInvitationUpdategroupIdsInputSchema),z.string().array() ]).optional(),
  expires: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export default OrganizationInvitationUpdateManyMutationInputSchema;
