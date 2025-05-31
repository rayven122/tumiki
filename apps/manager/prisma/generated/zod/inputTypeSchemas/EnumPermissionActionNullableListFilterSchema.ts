import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { PermissionActionSchema } from './PermissionActionSchema';

export const EnumPermissionActionNullableListFilterSchema: z.ZodType<Prisma.EnumPermissionActionNullableListFilter> = z.object({
  equals: z.lazy(() => PermissionActionSchema).array().optional().nullable(),
  has: z.lazy(() => PermissionActionSchema).optional().nullable(),
  hasEvery: z.lazy(() => PermissionActionSchema).array().optional(),
  hasSome: z.lazy(() => PermissionActionSchema).array().optional(),
  isEmpty: z.boolean().optional()
}).strict();

export default EnumPermissionActionNullableListFilterSchema;
