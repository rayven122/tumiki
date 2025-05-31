import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationCreateWithoutCreatorInputSchema } from './OrganizationCreateWithoutCreatorInputSchema';
import { OrganizationUncheckedCreateWithoutCreatorInputSchema } from './OrganizationUncheckedCreateWithoutCreatorInputSchema';

export const OrganizationCreateOrConnectWithoutCreatorInputSchema: z.ZodType<Prisma.OrganizationCreateOrConnectWithoutCreatorInput> = z.object({
  where: z.lazy(() => OrganizationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutCreatorInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutCreatorInputSchema) ]),
}).strict();

export default OrganizationCreateOrConnectWithoutCreatorInputSchema;
