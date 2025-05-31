import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerTypeSchema } from './ServerTypeSchema';

export const EnumServerTypeFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumServerTypeFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ServerTypeSchema).optional()
}).strict();

export default EnumServerTypeFieldUpdateOperationsInputSchema;
