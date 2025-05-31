import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateNestedManyWithoutGroupsInputSchema } from './OrganizationMemberCreateNestedManyWithoutGroupsInputSchema';
import { OrganizationRoleCreateNestedManyWithoutGroupsInputSchema } from './OrganizationRoleCreateNestedManyWithoutGroupsInputSchema';
import { ResourceAccessControlCreateNestedManyWithoutGroupInputSchema } from './ResourceAccessControlCreateNestedManyWithoutGroupInputSchema';

export const OrganizationGroupCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationGroupCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  members: z.lazy(() => OrganizationMemberCreateNestedManyWithoutGroupsInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleCreateNestedManyWithoutGroupsInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlCreateNestedManyWithoutGroupInputSchema).optional()
}).strict();

export default OrganizationGroupCreateWithoutOrganizationInputSchema;
