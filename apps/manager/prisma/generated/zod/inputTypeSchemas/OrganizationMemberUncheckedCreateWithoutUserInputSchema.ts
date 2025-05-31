import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleUncheckedCreateNestedManyWithoutMembersInputSchema } from './OrganizationRoleUncheckedCreateNestedManyWithoutMembersInputSchema';
import { OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema } from './OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema';
import { ResourceAccessControlUncheckedCreateNestedManyWithoutMemberInputSchema } from './ResourceAccessControlUncheckedCreateNestedManyWithoutMemberInputSchema';

export const OrganizationMemberUncheckedCreateWithoutUserInputSchema: z.ZodType<Prisma.OrganizationMemberUncheckedCreateWithoutUserInput> = z.object({
  id: z.string().optional(),
  organizationId: z.string(),
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  roles: z.lazy(() => OrganizationRoleUncheckedCreateNestedManyWithoutMembersInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedCreateNestedManyWithoutMemberInputSchema).optional()
}).strict();

export default OrganizationMemberUncheckedCreateWithoutUserInputSchema;
