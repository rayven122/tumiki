import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutMcpServerInstancesInputSchema } from './OrganizationCreateWithoutMcpServerInstancesInputSchema';
import { OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema } from './OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema';
import { OrganizationCreateOrConnectWithoutMcpServerInstancesInputSchema } from './OrganizationCreateOrConnectWithoutMcpServerInstancesInputSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';

export const OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema: z.ZodType<Prisma.OrganizationCreateNestedOneWithoutMcpServerInstancesInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutMcpServerInstancesInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationCreateOrConnectWithoutMcpServerInstancesInputSchema).optional(),
  connect: z.lazy(() => OrganizationWhereUniqueInputSchema).optional()
}).strict();

export default OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema;
