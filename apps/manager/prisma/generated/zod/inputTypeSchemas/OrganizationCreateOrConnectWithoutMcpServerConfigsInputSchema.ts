import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationCreateWithoutMcpServerConfigsInputSchema } from './OrganizationCreateWithoutMcpServerConfigsInputSchema';
import { OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema } from './OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema';

export const OrganizationCreateOrConnectWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.OrganizationCreateOrConnectWithoutMcpServerConfigsInput> = z.object({
  where: z.lazy(() => OrganizationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema) ]),
}).strict();

export default OrganizationCreateOrConnectWithoutMcpServerConfigsInputSchema;
