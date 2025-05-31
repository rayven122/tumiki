import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { PermissionActionSchema } from './PermissionActionSchema';

export const RolePermissionRoleIdResourceTypeActionCompoundUniqueInputSchema: z.ZodType<Prisma.RolePermissionRoleIdResourceTypeActionCompoundUniqueInput> = z.object({
  roleId: z.string(),
  resourceType: z.lazy(() => ResourceTypeSchema),
  action: z.lazy(() => PermissionActionSchema)
}).strict();

export default RolePermissionRoleIdResourceTypeActionCompoundUniqueInputSchema;
