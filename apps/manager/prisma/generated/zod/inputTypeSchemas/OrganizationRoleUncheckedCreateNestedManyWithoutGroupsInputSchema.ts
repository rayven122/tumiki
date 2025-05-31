import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleCreateWithoutGroupsInputSchema } from './OrganizationRoleCreateWithoutGroupsInputSchema';
import { OrganizationRoleUncheckedCreateWithoutGroupsInputSchema } from './OrganizationRoleUncheckedCreateWithoutGroupsInputSchema';
import { OrganizationRoleCreateOrConnectWithoutGroupsInputSchema } from './OrganizationRoleCreateOrConnectWithoutGroupsInputSchema';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';

export const OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleCreateWithoutGroupsInputSchema).array(),z.lazy(() => OrganizationRoleUncheckedCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutGroupsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationRoleCreateOrConnectWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleCreateOrConnectWithoutGroupsInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationRoleUncheckedCreateNestedManyWithoutGroupsInputSchema;
