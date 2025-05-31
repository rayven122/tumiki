import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberCreateWithoutUserInputSchema } from './OrganizationMemberCreateWithoutUserInputSchema';
import { OrganizationMemberUncheckedCreateWithoutUserInputSchema } from './OrganizationMemberUncheckedCreateWithoutUserInputSchema';

export const OrganizationMemberCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.OrganizationMemberCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutUserInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export default OrganizationMemberCreateOrConnectWithoutUserInputSchema;
