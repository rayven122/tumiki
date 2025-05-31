import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleUncheckedCreateNestedManyWithoutMembersInputSchema } from './OrganizationRoleUncheckedCreateNestedManyWithoutMembersInputSchema';
import { ResourceAccessControlUncheckedCreateNestedManyWithoutMemberInputSchema } from './ResourceAccessControlUncheckedCreateNestedManyWithoutMemberInputSchema';

export const OrganizationMemberUncheckedCreateWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationMemberUncheckedCreateWithoutGroupsInput> = z.object({
  id: z.string().optional(),
  organizationId: z.string(),
  userId: z.string(),
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  roles: z.lazy(() => OrganizationRoleUncheckedCreateNestedManyWithoutMembersInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedCreateNestedManyWithoutMemberInputSchema).optional()
}).strict();

export default OrganizationMemberUncheckedCreateWithoutGroupsInputSchema;
