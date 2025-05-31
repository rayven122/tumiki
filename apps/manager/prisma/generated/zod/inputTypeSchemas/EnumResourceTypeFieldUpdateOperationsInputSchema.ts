import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceTypeSchema } from './ResourceTypeSchema';

export const EnumResourceTypeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumResourceTypeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ResourceTypeSchema).optional()
}).strict();

export default EnumResourceTypeFieldUpdateOperationsInputSchema;
