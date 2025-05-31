import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserCreateNestedOneWithoutMembersInputSchema } from './UserCreateNestedOneWithoutMembersInputSchema';
import { OrganizationRoleCreateNestedManyWithoutMembersInputSchema } from './OrganizationRoleCreateNestedManyWithoutMembersInputSchema';
import { OrganizationGroupCreateNestedManyWithoutMembersInputSchema } from './OrganizationGroupCreateNestedManyWithoutMembersInputSchema';
import { ResourceAccessControlCreateNestedManyWithoutMemberInputSchema } from './ResourceAccessControlCreateNestedManyWithoutMemberInputSchema';

export const OrganizationMemberCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationMemberCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutMembersInputSchema),
  roles: z.lazy(() => OrganizationRoleCreateNestedManyWithoutMembersInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupCreateNestedManyWithoutMembersInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlCreateNestedManyWithoutMemberInputSchema).optional()
}).strict();

export default OrganizationMemberCreateWithoutOrganizationInputSchema;
