import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationUpdateWithoutCreatorInputSchema } from './OrganizationUpdateWithoutCreatorInputSchema';
import { OrganizationUncheckedUpdateWithoutCreatorInputSchema } from './OrganizationUncheckedUpdateWithoutCreatorInputSchema';

export const OrganizationUpdateWithWhereUniqueWithoutCreatorInputSchema: z.ZodType<Prisma.OrganizationUpdateWithWhereUniqueWithoutCreatorInput> = z.object({
  where: z.lazy(() => OrganizationWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationUpdateWithoutCreatorInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutCreatorInputSchema) ]),
}).strict();

export default OrganizationUpdateWithWhereUniqueWithoutCreatorInputSchema;
