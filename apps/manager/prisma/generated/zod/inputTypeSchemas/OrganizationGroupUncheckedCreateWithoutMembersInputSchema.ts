import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema } from './OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema';
import { ResourceAccessControlUncheckedCreateNestedManyWithoutGroupInputSchema } from './ResourceAccessControlUncheckedCreateNestedManyWithoutGroupInputSchema';

export const OrganizationGroupUncheckedCreateWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationGroupUncheckedCreateWithoutMembersInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  organizationId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  roles: z.lazy(() => OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedCreateNestedManyWithoutGroupInputSchema).optional()
}).strict();

export default OrganizationGroupUncheckedCreateWithoutMembersInputSchema;
