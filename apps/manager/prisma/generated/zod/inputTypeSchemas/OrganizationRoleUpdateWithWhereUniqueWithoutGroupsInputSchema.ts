import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleUpdateWithoutGroupsInputSchema } from './OrganizationRoleUpdateWithoutGroupsInputSchema';
import { OrganizationRoleUncheckedUpdateWithoutGroupsInputSchema } from './OrganizationRoleUncheckedUpdateWithoutGroupsInputSchema';

export const OrganizationRoleUpdateWithWhereUniqueWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateWithWhereUniqueWithoutGroupsInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationRoleUpdateWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateWithoutGroupsInputSchema) ]),
}).strict();

export default OrganizationRoleUpdateWithWhereUniqueWithoutGroupsInputSchema;
