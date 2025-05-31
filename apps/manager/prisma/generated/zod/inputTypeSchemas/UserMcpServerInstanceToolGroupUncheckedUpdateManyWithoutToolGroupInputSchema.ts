import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { IntFieldUpdateOperationsInputSchema } from './IntFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';

export const UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupInput> = z.object({
  mcpServerInstanceId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  sortOrder: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export default UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupInputSchema;
