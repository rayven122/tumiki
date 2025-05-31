import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationUpdateWithoutCreatorInputSchema } from './OrganizationUpdateWithoutCreatorInputSchema';
import { OrganizationUncheckedUpdateWithoutCreatorInputSchema } from './OrganizationUncheckedUpdateWithoutCreatorInputSchema';
import { OrganizationCreateWithoutCreatorInputSchema } from './OrganizationCreateWithoutCreatorInputSchema';
import { OrganizationUncheckedCreateWithoutCreatorInputSchema } from './OrganizationUncheckedCreateWithoutCreatorInputSchema';

export const OrganizationUpsertWithWhereUniqueWithoutCreatorInputSchema: z.ZodType<Prisma.OrganizationUpsertWithWhereUniqueWithoutCreatorInput> = z.object({
  where: z.lazy(() => OrganizationWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationUpdateWithoutCreatorInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutCreatorInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutCreatorInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutCreatorInputSchema) ]),
}).strict();

export default OrganizationUpsertWithWhereUniqueWithoutCreatorInputSchema;
