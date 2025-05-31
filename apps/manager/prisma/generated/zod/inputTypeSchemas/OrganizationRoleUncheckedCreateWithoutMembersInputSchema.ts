import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RolePermissionUncheckedCreateNestedManyWithoutRoleInputSchema } from './RolePermissionUncheckedCreateNestedManyWithoutRoleInputSchema';
import { OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema } from './OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema';

export const OrganizationRoleUncheckedCreateWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationRoleUncheckedCreateWithoutMembersInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  organizationId: z.string(),
  isDefault: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  permissions: z.lazy(() => RolePermissionUncheckedCreateNestedManyWithoutRoleInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema).optional()
}).strict();

export default OrganizationRoleUncheckedCreateWithoutMembersInputSchema;
