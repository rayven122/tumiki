import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { IntFieldUpdateOperationsInputSchema } from './IntFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserMcpServerInstanceUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema } from './UserMcpServerInstanceUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema';

export const UserMcpServerInstanceToolGroupUpdateWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpdateWithoutToolGroupInput> = z.object({
  sortOrder: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema).optional()
}).strict();

export default UserMcpServerInstanceToolGroupUpdateWithoutToolGroupInputSchema;
