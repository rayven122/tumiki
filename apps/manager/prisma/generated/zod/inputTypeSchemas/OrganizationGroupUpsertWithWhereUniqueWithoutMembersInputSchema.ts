import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupUpdateWithoutMembersInputSchema } from './OrganizationGroupUpdateWithoutMembersInputSchema';
import { OrganizationGroupUncheckedUpdateWithoutMembersInputSchema } from './OrganizationGroupUncheckedUpdateWithoutMembersInputSchema';
import { OrganizationGroupCreateWithoutMembersInputSchema } from './OrganizationGroupCreateWithoutMembersInputSchema';
import { OrganizationGroupUncheckedCreateWithoutMembersInputSchema } from './OrganizationGroupUncheckedCreateWithoutMembersInputSchema';

export const OrganizationGroupUpsertWithWhereUniqueWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationGroupUpsertWithWhereUniqueWithoutMembersInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationGroupUpdateWithoutMembersInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateWithoutMembersInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutMembersInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutMembersInputSchema) ]),
}).strict();

export default OrganizationGroupUpsertWithWhereUniqueWithoutMembersInputSchema;
