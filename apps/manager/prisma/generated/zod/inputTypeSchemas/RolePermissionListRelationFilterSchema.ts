import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RolePermissionWhereInputSchema } from './RolePermissionWhereInputSchema';

export const RolePermissionListRelationFilterSchema: z.ZodType<Prisma.RolePermissionListRelationFilter> = z.object({
  every: z.lazy(() => RolePermissionWhereInputSchema).optional(),
  some: z.lazy(() => RolePermissionWhereInputSchema).optional(),
  none: z.lazy(() => RolePermissionWhereInputSchema).optional()
}).strict();

export default RolePermissionListRelationFilterSchema;
