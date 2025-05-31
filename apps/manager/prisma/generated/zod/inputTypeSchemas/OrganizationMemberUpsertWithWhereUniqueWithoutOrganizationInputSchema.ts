import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithoutOrganizationInputSchema } from './OrganizationMemberUpdateWithoutOrganizationInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutOrganizationInputSchema } from './OrganizationMemberUncheckedUpdateWithoutOrganizationInputSchema';
import { OrganizationMemberCreateWithoutOrganizationInputSchema } from './OrganizationMemberCreateWithoutOrganizationInputSchema';
import { OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema';

export const OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationMemberUpdateWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutOrganizationInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInputSchema;
