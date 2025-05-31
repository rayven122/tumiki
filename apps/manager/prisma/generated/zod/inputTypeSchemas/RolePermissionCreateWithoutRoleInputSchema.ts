import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { PermissionActionSchema } from './PermissionActionSchema';

export const RolePermissionCreateWithoutRoleInputSchema: z.ZodType<Prisma.RolePermissionCreateWithoutRoleInput> = z.object({
  id: z.string().optional(),
  resourceType: z.lazy(() => ResourceTypeSchema),
  action: z.lazy(() => PermissionActionSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default RolePermissionCreateWithoutRoleInputSchema;
