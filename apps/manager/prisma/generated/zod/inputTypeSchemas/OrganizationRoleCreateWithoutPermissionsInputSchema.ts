import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateNestedOneWithoutRolesInputSchema } from './OrganizationCreateNestedOneWithoutRolesInputSchema';
import { OrganizationMemberCreateNestedManyWithoutRolesInputSchema } from './OrganizationMemberCreateNestedManyWithoutRolesInputSchema';
import { OrganizationGroupCreateNestedManyWithoutRolesInputSchema } from './OrganizationGroupCreateNestedManyWithoutRolesInputSchema';

export const OrganizationRoleCreateWithoutPermissionsInputSchema: z.ZodType<Prisma.OrganizationRoleCreateWithoutPermissionsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutRolesInputSchema),
  members: z.lazy(() => OrganizationMemberCreateNestedManyWithoutRolesInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupCreateNestedManyWithoutRolesInputSchema).optional()
}).strict();

export default OrganizationRoleCreateWithoutPermissionsInputSchema;
