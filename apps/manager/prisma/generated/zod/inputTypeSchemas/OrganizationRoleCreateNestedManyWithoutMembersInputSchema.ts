import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleCreateWithoutMembersInputSchema } from './OrganizationRoleCreateWithoutMembersInputSchema';
import { OrganizationRoleUncheckedCreateWithoutMembersInputSchema } from './OrganizationRoleUncheckedCreateWithoutMembersInputSchema';
import { OrganizationRoleCreateOrConnectWithoutMembersInputSchema } from './OrganizationRoleCreateOrConnectWithoutMembersInputSchema';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';

export const OrganizationRoleCreateNestedManyWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationRoleCreateNestedManyWithoutMembersInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutMembersInputSchema),z.lazy(() => OrganizationRoleCreateWithoutMembersInputSchema).array(),z.lazy(() => OrganizationRoleUncheckedCreateWithoutMembersInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutMembersInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationRoleCreateOrConnectWithoutMembersInputSchema),z.lazy(() => OrganizationRoleCreateOrConnectWithoutMembersInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationRoleCreateNestedManyWithoutMembersInputSchema;
