import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberUncheckedCreateNestedManyWithoutRolesInputSchema } from './OrganizationMemberUncheckedCreateNestedManyWithoutRolesInputSchema';
import { OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema } from './OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema';

export const OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema: z.ZodType<Prisma.OrganizationRoleUncheckedCreateWithoutPermissionsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  organizationId: z.string(),
  isDefault: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  members: z.lazy(() => OrganizationMemberUncheckedCreateNestedManyWithoutRolesInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema).optional()
}).strict();

export default OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema;
