import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateNestedOneWithoutMembersInputSchema } from './OrganizationCreateNestedOneWithoutMembersInputSchema';
import { UserCreateNestedOneWithoutMembersInputSchema } from './UserCreateNestedOneWithoutMembersInputSchema';
import { OrganizationRoleCreateNestedManyWithoutMembersInputSchema } from './OrganizationRoleCreateNestedManyWithoutMembersInputSchema';
import { OrganizationGroupCreateNestedManyWithoutMembersInputSchema } from './OrganizationGroupCreateNestedManyWithoutMembersInputSchema';
import { ResourceAccessControlCreateNestedManyWithoutMemberInputSchema } from './ResourceAccessControlCreateNestedManyWithoutMemberInputSchema';

export const OrganizationMemberCreateInputSchema: z.ZodType<Prisma.OrganizationMemberCreateInput> = z.object({
  id: z.string().optional(),
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutMembersInputSchema),
  user: z.lazy(() => UserCreateNestedOneWithoutMembersInputSchema),
  roles: z.lazy(() => OrganizationRoleCreateNestedManyWithoutMembersInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupCreateNestedManyWithoutMembersInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlCreateNestedManyWithoutMemberInputSchema).optional()
}).strict();

export default OrganizationMemberCreateInputSchema;
