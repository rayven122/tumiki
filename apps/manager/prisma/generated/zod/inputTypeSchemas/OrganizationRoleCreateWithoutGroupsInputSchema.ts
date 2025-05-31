import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateNestedOneWithoutRolesInputSchema } from './OrganizationCreateNestedOneWithoutRolesInputSchema';
import { RolePermissionCreateNestedManyWithoutRoleInputSchema } from './RolePermissionCreateNestedManyWithoutRoleInputSchema';
import { OrganizationMemberCreateNestedManyWithoutRolesInputSchema } from './OrganizationMemberCreateNestedManyWithoutRolesInputSchema';

export const OrganizationRoleCreateWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationRoleCreateWithoutGroupsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutRolesInputSchema),
  permissions: z.lazy(() => RolePermissionCreateNestedManyWithoutRoleInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberCreateNestedManyWithoutRolesInputSchema).optional()
}).strict();

export default OrganizationRoleCreateWithoutGroupsInputSchema;
