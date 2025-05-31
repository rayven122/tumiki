import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema } from './OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema';
import { OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema } from './OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema';
import { ResourceAccessControlUncheckedCreateNestedManyWithoutGroupInputSchema } from './ResourceAccessControlUncheckedCreateNestedManyWithoutGroupInputSchema';

export const OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationGroupUncheckedCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  members: z.lazy(() => OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedCreateNestedManyWithoutGroupInputSchema).optional()
}).strict();

export default OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema;
