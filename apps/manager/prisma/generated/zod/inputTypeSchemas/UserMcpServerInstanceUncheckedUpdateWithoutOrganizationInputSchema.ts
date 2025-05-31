import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { ServerStatusSchema } from './ServerStatusSchema';
import { EnumServerStatusFieldUpdateOperationsInputSchema } from './EnumServerStatusFieldUpdateOperationsInputSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { EnumServerTypeFieldUpdateOperationsInputSchema } from './EnumServerTypeFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutMcpServerInstanceNestedInputSchema } from './UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutMcpServerInstanceNestedInputSchema';

export const UserMcpServerInstanceUncheckedUpdateWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUncheckedUpdateWithoutOrganizationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  iconPath: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  serverStatus: z.union([ z.lazy(() => ServerStatusSchema),z.lazy(() => EnumServerStatusFieldUpdateOperationsInputSchema) ]).optional(),
  serverType: z.union([ z.lazy(() => ServerTypeSchema),z.lazy(() => EnumServerTypeFieldUpdateOperationsInputSchema) ]).optional(),
  toolGroupId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutMcpServerInstanceNestedInputSchema).optional()
}).strict();

export default UserMcpServerInstanceUncheckedUpdateWithoutOrganizationInputSchema;
