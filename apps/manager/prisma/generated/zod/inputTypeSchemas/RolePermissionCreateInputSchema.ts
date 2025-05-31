import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { PermissionActionSchema } from './PermissionActionSchema';
import { OrganizationRoleCreateNestedOneWithoutPermissionsInputSchema } from './OrganizationRoleCreateNestedOneWithoutPermissionsInputSchema';

export const RolePermissionCreateInputSchema: z.ZodType<Prisma.RolePermissionCreateInput> = z.object({
  id: z.string().optional(),
  resourceType: z.lazy(() => ResourceTypeSchema),
  action: z.lazy(() => PermissionActionSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  role: z.lazy(() => OrganizationRoleCreateNestedOneWithoutPermissionsInputSchema)
}).strict();

export default RolePermissionCreateInputSchema;
