import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationScalarWhereInputSchema } from './OrganizationScalarWhereInputSchema';
import { OrganizationUpdateManyMutationInputSchema } from './OrganizationUpdateManyMutationInputSchema';
import { OrganizationUncheckedUpdateManyWithoutCreatorInputSchema } from './OrganizationUncheckedUpdateManyWithoutCreatorInputSchema';

export const OrganizationUpdateManyWithWhereWithoutCreatorInputSchema: z.ZodType<Prisma.OrganizationUpdateManyWithWhereWithoutCreatorInput> = z.object({
  where: z.lazy(() => OrganizationScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationUpdateManyMutationInputSchema),z.lazy(() => OrganizationUncheckedUpdateManyWithoutCreatorInputSchema) ]),
}).strict();

export default OrganizationUpdateManyWithWhereWithoutCreatorInputSchema;
