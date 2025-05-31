import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupCreateWithoutMembersInputSchema } from './OrganizationGroupCreateWithoutMembersInputSchema';
import { OrganizationGroupUncheckedCreateWithoutMembersInputSchema } from './OrganizationGroupUncheckedCreateWithoutMembersInputSchema';
import { OrganizationGroupCreateOrConnectWithoutMembersInputSchema } from './OrganizationGroupCreateOrConnectWithoutMembersInputSchema';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';

export const OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationGroupUncheckedCreateNestedManyWithoutMembersInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutMembersInputSchema),z.lazy(() => OrganizationGroupCreateWithoutMembersInputSchema).array(),z.lazy(() => OrganizationGroupUncheckedCreateWithoutMembersInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutMembersInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationGroupCreateOrConnectWithoutMembersInputSchema),z.lazy(() => OrganizationGroupCreateOrConnectWithoutMembersInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationGroupUncheckedCreateNestedManyWithoutMembersInputSchema;
