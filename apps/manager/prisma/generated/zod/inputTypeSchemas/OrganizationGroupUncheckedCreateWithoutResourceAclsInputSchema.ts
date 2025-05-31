import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema } from './OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema';
import { OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema } from './OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema';

export const OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationGroupUncheckedCreateWithoutResourceAclsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  organizationId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  members: z.lazy(() => OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema).optional()
}).strict();

export default OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema;
