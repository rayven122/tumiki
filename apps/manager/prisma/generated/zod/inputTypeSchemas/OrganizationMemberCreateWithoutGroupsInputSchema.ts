import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateNestedOneWithoutMembersInputSchema } from './OrganizationCreateNestedOneWithoutMembersInputSchema';
import { UserCreateNestedOneWithoutMembersInputSchema } from './UserCreateNestedOneWithoutMembersInputSchema';
import { OrganizationRoleCreateNestedManyWithoutMembersInputSchema } from './OrganizationRoleCreateNestedManyWithoutMembersInputSchema';
import { ResourceAccessControlCreateNestedManyWithoutMemberInputSchema } from './ResourceAccessControlCreateNestedManyWithoutMemberInputSchema';

export const OrganizationMemberCreateWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationMemberCreateWithoutGroupsInput> = z.object({
  id: z.string().optional(),
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutMembersInputSchema),
  user: z.lazy(() => UserCreateNestedOneWithoutMembersInputSchema),
  roles: z.lazy(() => OrganizationRoleCreateNestedManyWithoutMembersInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlCreateNestedManyWithoutMemberInputSchema).optional()
}).strict();

export default OrganizationMemberCreateWithoutGroupsInputSchema;
