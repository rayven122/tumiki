import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { IntFieldUpdateOperationsInputSchema } from './IntFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';

export const UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpdateManyMutationInput> = z.object({
  sortOrder: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export default UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema;
