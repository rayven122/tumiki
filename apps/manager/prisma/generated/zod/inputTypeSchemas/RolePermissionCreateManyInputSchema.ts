import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { PermissionActionSchema } from './PermissionActionSchema';

export const RolePermissionCreateManyInputSchema: z.ZodType<Prisma.RolePermissionCreateManyInput> = z.object({
  id: z.string().optional(),
  roleId: z.string(),
  resourceType: z.lazy(() => ResourceTypeSchema),
  action: z.lazy(() => PermissionActionSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default RolePermissionCreateManyInputSchema;
