import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { BoolFieldUpdateOperationsInputSchema } from './BoolFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserMcpServerInstanceUncheckedUpdateOneWithoutToolGroupNestedInputSchema } from './UserMcpServerInstanceUncheckedUpdateOneWithoutToolGroupNestedInputSchema';
import { UserToolGroupToolUncheckedUpdateManyWithoutToolGroupNestedInputSchema } from './UserToolGroupToolUncheckedUpdateManyWithoutToolGroupNestedInputSchema';

export const UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  isEnabled: z.union([ z.boolean(),z.lazy(() => BoolFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  organizationId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceUncheckedUpdateOneWithoutToolGroupNestedInputSchema).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolUncheckedUpdateManyWithoutToolGroupNestedInputSchema).optional()
}).strict();

export default UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema;
