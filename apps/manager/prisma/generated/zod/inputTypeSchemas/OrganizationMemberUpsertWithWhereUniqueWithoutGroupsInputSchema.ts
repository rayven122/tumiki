import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithoutGroupsInputSchema } from './OrganizationMemberUpdateWithoutGroupsInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutGroupsInputSchema } from './OrganizationMemberUncheckedUpdateWithoutGroupsInputSchema';
import { OrganizationMemberCreateWithoutGroupsInputSchema } from './OrganizationMemberCreateWithoutGroupsInputSchema';
import { OrganizationMemberUncheckedCreateWithoutGroupsInputSchema } from './OrganizationMemberUncheckedCreateWithoutGroupsInputSchema';

export const OrganizationMemberUpsertWithWhereUniqueWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationMemberUpsertWithWhereUniqueWithoutGroupsInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationMemberUpdateWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutGroupsInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutGroupsInputSchema) ]),
}).strict();

export default OrganizationMemberUpsertWithWhereUniqueWithoutGroupsInputSchema;
