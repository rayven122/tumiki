import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerStatusSchema } from './ServerStatusSchema';

export const EnumServerStatusFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumServerStatusFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => ServerStatusSchema).optional()
}).strict();

export default EnumServerStatusFieldUpdateOperationsInputSchema;
