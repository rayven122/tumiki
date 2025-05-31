import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithoutUserInputSchema } from './OrganizationMemberUpdateWithoutUserInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutUserInputSchema } from './OrganizationMemberUncheckedUpdateWithoutUserInputSchema';
import { OrganizationMemberCreateWithoutUserInputSchema } from './OrganizationMemberCreateWithoutUserInputSchema';
import { OrganizationMemberUncheckedCreateWithoutUserInputSchema } from './OrganizationMemberUncheckedCreateWithoutUserInputSchema';

export const OrganizationMemberUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.OrganizationMemberUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationMemberUpdateWithoutUserInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutUserInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export default OrganizationMemberUpsertWithWhereUniqueWithoutUserInputSchema;
