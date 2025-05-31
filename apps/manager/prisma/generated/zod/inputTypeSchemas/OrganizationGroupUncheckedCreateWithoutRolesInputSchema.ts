import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema } from './OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema';
import { ResourceAccessControlUncheckedCreateNestedManyWithoutGroupInputSchema } from './ResourceAccessControlUncheckedCreateNestedManyWithoutGroupInputSchema';

export const OrganizationGroupUncheckedCreateWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationGroupUncheckedCreateWithoutRolesInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  organizationId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  members: z.lazy(() => OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlUncheckedCreateNestedManyWithoutGroupInputSchema).optional()
}).strict();

export default OrganizationGroupUncheckedCreateWithoutRolesInputSchema;
