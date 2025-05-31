import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationCreateWithoutMcpServerInstancesInputSchema } from './OrganizationCreateWithoutMcpServerInstancesInputSchema';
import { OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema } from './OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema';

export const OrganizationCreateOrConnectWithoutMcpServerInstancesInputSchema: z.ZodType<Prisma.OrganizationCreateOrConnectWithoutMcpServerInstancesInput> = z.object({
  where: z.lazy(() => OrganizationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutMcpServerInstancesInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema) ]),
}).strict();

export default OrganizationCreateOrConnectWithoutMcpServerInstancesInputSchema;
