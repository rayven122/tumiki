import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { PermissionActionSchema } from './PermissionActionSchema';
import { NestedEnumPermissionActionFilterSchema } from './NestedEnumPermissionActionFilterSchema';

export const EnumPermissionActionFilterSchema: z.ZodType<Prisma.EnumPermissionActionFilter> = z.object({
  equals: z.lazy(() => PermissionActionSchema).optional(),
  in: z.lazy(() => PermissionActionSchema).array().optional(),
  notIn: z.lazy(() => PermissionActionSchema).array().optional(),
  not: z.union([ z.lazy(() => PermissionActionSchema),z.lazy(() => NestedEnumPermissionActionFilterSchema) ]).optional(),
}).strict();

export default EnumPermissionActionFilterSchema;
