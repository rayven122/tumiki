import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleUpdateWithoutGroupsInputSchema } from './OrganizationRoleUpdateWithoutGroupsInputSchema';
import { OrganizationRoleUncheckedUpdateWithoutGroupsInputSchema } from './OrganizationRoleUncheckedUpdateWithoutGroupsInputSchema';
import { OrganizationRoleCreateWithoutGroupsInputSchema } from './OrganizationRoleCreateWithoutGroupsInputSchema';
import { OrganizationRoleUncheckedCreateWithoutGroupsInputSchema } from './OrganizationRoleUncheckedCreateWithoutGroupsInputSchema';

export const OrganizationRoleUpsertWithWhereUniqueWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationRoleUpsertWithWhereUniqueWithoutGroupsInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationRoleUpdateWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateWithoutGroupsInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutGroupsInputSchema) ]),
}).strict();

export default OrganizationRoleUpsertWithWhereUniqueWithoutGroupsInputSchema;
