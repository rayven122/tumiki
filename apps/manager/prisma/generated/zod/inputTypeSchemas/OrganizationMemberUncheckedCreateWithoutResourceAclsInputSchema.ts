import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleUncheckedCreateNestedManyWithoutMembersInputSchema } from './OrganizationRoleUncheckedCreateNestedManyWithoutMembersInputSchema';
import { OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema } from './OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema';

export const OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationMemberUncheckedCreateWithoutResourceAclsInput> = z.object({
  id: z.string().optional(),
  organizationId: z.string(),
  userId: z.string(),
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  roles: z.lazy(() => OrganizationRoleUncheckedCreateNestedManyWithoutMembersInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema).optional()
}).strict();

export default OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema;
