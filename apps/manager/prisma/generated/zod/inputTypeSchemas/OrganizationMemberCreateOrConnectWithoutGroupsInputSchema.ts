import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberCreateWithoutGroupsInputSchema } from './OrganizationMemberCreateWithoutGroupsInputSchema';
import { OrganizationMemberUncheckedCreateWithoutGroupsInputSchema } from './OrganizationMemberUncheckedCreateWithoutGroupsInputSchema';

export const OrganizationMemberCreateOrConnectWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationMemberCreateOrConnectWithoutGroupsInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutGroupsInputSchema) ]),
}).strict();

export default OrganizationMemberCreateOrConnectWithoutGroupsInputSchema;
