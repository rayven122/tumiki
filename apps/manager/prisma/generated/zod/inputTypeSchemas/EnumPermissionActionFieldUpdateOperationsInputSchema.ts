import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { PermissionActionSchema } from './PermissionActionSchema';

export const EnumPermissionActionFieldUpdateOperationsInputSchema: z.ZodType<Prisma.EnumPermissionActionFieldUpdateOperationsInput> = z.object({
  set: z.lazy(() => PermissionActionSchema).optional()
}).strict();

export default EnumPermissionActionFieldUpdateOperationsInputSchema;
