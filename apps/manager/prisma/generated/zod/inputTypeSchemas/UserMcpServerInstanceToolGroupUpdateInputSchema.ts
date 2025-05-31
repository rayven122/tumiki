import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { IntFieldUpdateOperationsInputSchema } from './IntFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserMcpServerInstanceUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema } from './UserMcpServerInstanceUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema';
import { UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema } from './UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema';

export const UserMcpServerInstanceToolGroupUpdateInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpdateInput> = z.object({
  sortOrder: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema).optional(),
  toolGroup: z.lazy(() => UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema).optional()
}).strict();

export default UserMcpServerInstanceToolGroupUpdateInputSchema;
