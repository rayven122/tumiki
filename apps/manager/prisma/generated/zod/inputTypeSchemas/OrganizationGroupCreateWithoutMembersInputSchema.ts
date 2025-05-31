import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateNestedOneWithoutGroupsInputSchema } from './OrganizationCreateNestedOneWithoutGroupsInputSchema';
import { OrganizationRoleCreateNestedManyWithoutGroupsInputSchema } from './OrganizationRoleCreateNestedManyWithoutGroupsInputSchema';
import { ResourceAccessControlCreateNestedManyWithoutGroupInputSchema } from './ResourceAccessControlCreateNestedManyWithoutGroupInputSchema';

export const OrganizationGroupCreateWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationGroupCreateWithoutMembersInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutGroupsInputSchema),
  roles: z.lazy(() => OrganizationRoleCreateNestedManyWithoutGroupsInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlCreateNestedManyWithoutGroupInputSchema).optional()
}).strict();

export default OrganizationGroupCreateWithoutMembersInputSchema;
