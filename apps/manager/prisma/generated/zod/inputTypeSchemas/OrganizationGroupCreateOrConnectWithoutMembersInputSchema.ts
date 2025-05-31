import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupCreateWithoutMembersInputSchema } from './OrganizationGroupCreateWithoutMembersInputSchema';
import { OrganizationGroupUncheckedCreateWithoutMembersInputSchema } from './OrganizationGroupUncheckedCreateWithoutMembersInputSchema';

export const OrganizationGroupCreateOrConnectWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationGroupCreateOrConnectWithoutMembersInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutMembersInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutMembersInputSchema) ]),
}).strict();

export default OrganizationGroupCreateOrConnectWithoutMembersInputSchema;
