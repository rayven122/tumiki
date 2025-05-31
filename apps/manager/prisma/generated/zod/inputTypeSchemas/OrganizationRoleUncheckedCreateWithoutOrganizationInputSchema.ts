import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RolePermissionUncheckedCreateNestedManyWithoutRoleInputSchema } from './RolePermissionUncheckedCreateNestedManyWithoutRoleInputSchema';
import { OrganizationMemberUncheckedCreateNestedManyWithoutRolesInputSchema } from './OrganizationMemberUncheckedCreateNestedManyWithoutRolesInputSchema';
import { OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema } from './OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema';

export const OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationRoleUncheckedCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  permissions: z.lazy(() => RolePermissionUncheckedCreateNestedManyWithoutRoleInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberUncheckedCreateNestedManyWithoutRolesInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema).optional()
}).strict();

export default OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema;
