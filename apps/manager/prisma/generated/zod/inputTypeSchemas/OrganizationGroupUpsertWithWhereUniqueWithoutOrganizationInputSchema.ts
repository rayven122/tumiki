import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupUpdateWithoutOrganizationInputSchema } from './OrganizationGroupUpdateWithoutOrganizationInputSchema';
import { OrganizationGroupUncheckedUpdateWithoutOrganizationInputSchema } from './OrganizationGroupUncheckedUpdateWithoutOrganizationInputSchema';
import { OrganizationGroupCreateWithoutOrganizationInputSchema } from './OrganizationGroupCreateWithoutOrganizationInputSchema';
import { OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema';

export const OrganizationGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationGroupUpsertWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationGroupUpdateWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateWithoutOrganizationInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema;
