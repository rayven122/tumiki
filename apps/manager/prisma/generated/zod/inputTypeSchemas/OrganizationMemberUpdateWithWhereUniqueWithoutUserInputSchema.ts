import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithoutUserInputSchema } from './OrganizationMemberUpdateWithoutUserInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutUserInputSchema } from './OrganizationMemberUncheckedUpdateWithoutUserInputSchema';

export const OrganizationMemberUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationMemberUpdateWithoutUserInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export default OrganizationMemberUpdateWithWhereUniqueWithoutUserInputSchema;
