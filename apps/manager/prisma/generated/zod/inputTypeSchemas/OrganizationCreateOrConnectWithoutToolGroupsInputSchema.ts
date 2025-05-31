import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationCreateWithoutToolGroupsInputSchema } from './OrganizationCreateWithoutToolGroupsInputSchema';
import { OrganizationUncheckedCreateWithoutToolGroupsInputSchema } from './OrganizationUncheckedCreateWithoutToolGroupsInputSchema';

export const OrganizationCreateOrConnectWithoutToolGroupsInputSchema: z.ZodType<Prisma.OrganizationCreateOrConnectWithoutToolGroupsInput> = z.object({
  where: z.lazy(() => OrganizationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutToolGroupsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutToolGroupsInputSchema) ]),
}).strict();

export default OrganizationCreateOrConnectWithoutToolGroupsInputSchema;
