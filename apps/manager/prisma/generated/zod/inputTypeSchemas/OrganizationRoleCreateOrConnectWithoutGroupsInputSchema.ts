import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleCreateWithoutGroupsInputSchema } from './OrganizationRoleCreateWithoutGroupsInputSchema';
import { OrganizationRoleUncheckedCreateWithoutGroupsInputSchema } from './OrganizationRoleUncheckedCreateWithoutGroupsInputSchema';

export const OrganizationRoleCreateOrConnectWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationRoleCreateOrConnectWithoutGroupsInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutGroupsInputSchema) ]),
}).strict();

export default OrganizationRoleCreateOrConnectWithoutGroupsInputSchema;
