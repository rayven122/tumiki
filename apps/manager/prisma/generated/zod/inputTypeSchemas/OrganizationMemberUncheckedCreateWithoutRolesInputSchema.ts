import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema } from './OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema';
import { ResourceAccessControlUncheckedCreateNestedManyWithoutMemberInputSchema } from './ResourceAccessControlUncheckedCreateNestedManyWithoutMemberInputSchema';

export const OrganizationMemberUncheckedCreateWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationMemberUncheckedCreateWithoutRolesInput> = z.object({
  id: z.string().optional(),
  organizationId: z.string(),
  userId: z.string(),
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedCreateNestedManyWithoutMemberInputSchema).optional()
}).strict();

export default OrganizationMemberUncheckedCreateWithoutRolesInputSchema;
