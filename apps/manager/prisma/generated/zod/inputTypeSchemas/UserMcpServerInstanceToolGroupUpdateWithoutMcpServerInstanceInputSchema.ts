import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { IntFieldUpdateOperationsInputSchema } from './IntFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema } from './UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema';

export const UserMcpServerInstanceToolGroupUpdateWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpdateWithoutMcpServerInstanceInput> = z.object({
  sortOrder: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  toolGroup: z.lazy(() => UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema).optional()
}).strict();

export default UserMcpServerInstanceToolGroupUpdateWithoutMcpServerInstanceInputSchema;
