import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationCreateWithoutGroupsInputSchema } from './OrganizationCreateWithoutGroupsInputSchema';
import { OrganizationUncheckedCreateWithoutGroupsInputSchema } from './OrganizationUncheckedCreateWithoutGroupsInputSchema';

export const OrganizationCreateOrConnectWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationCreateOrConnectWithoutGroupsInput> = z.object({
  where: z.lazy(() => OrganizationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutGroupsInputSchema) ]),
}).strict();

export default OrganizationCreateOrConnectWithoutGroupsInputSchema;
