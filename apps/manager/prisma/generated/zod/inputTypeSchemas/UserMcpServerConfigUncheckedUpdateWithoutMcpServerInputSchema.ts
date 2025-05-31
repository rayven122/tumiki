import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { NullableStringFieldUpdateOperationsInputSchema } from './NullableStringFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { ToolUncheckedUpdateManyWithoutMcpServerConfigsNestedInputSchema } from './ToolUncheckedUpdateManyWithoutMcpServerConfigsNestedInputSchema';
import { UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigNestedInputSchema } from './UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigNestedInputSchema';

export const UserMcpServerConfigUncheckedUpdateWithoutMcpServerInputSchema: z.ZodType<Prisma.UserMcpServerConfigUncheckedUpdateWithoutMcpServerInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  name: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  description: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  envVars: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  userId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  organizationId: z.union([ z.string(),z.lazy(() => NullableStringFieldUpdateOperationsInputSchema) ]).optional().nullable(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  tools: z.lazy(() => ToolUncheckedUpdateManyWithoutMcpServerConfigsNestedInputSchema).optional(),
  userToolGroupTools: z.lazy(() => UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigNestedInputSchema).optional()
}).strict();

export default UserMcpServerConfigUncheckedUpdateWithoutMcpServerInputSchema;
