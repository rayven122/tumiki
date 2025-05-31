import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RolePermissionCreateNestedManyWithoutRoleInputSchema } from './RolePermissionCreateNestedManyWithoutRoleInputSchema';
import { OrganizationMemberCreateNestedManyWithoutRolesInputSchema } from './OrganizationMemberCreateNestedManyWithoutRolesInputSchema';
import { OrganizationGroupCreateNestedManyWithoutRolesInputSchema } from './OrganizationGroupCreateNestedManyWithoutRolesInputSchema';

export const OrganizationRoleCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationRoleCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  permissions: z.lazy(() => RolePermissionCreateNestedManyWithoutRoleInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberCreateNestedManyWithoutRolesInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupCreateNestedManyWithoutRolesInputSchema).optional()
}).strict();

export default OrganizationRoleCreateWithoutOrganizationInputSchema;
