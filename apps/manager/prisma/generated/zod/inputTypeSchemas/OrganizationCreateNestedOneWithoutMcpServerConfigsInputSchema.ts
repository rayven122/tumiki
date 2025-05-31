import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutMcpServerConfigsInputSchema } from './OrganizationCreateWithoutMcpServerConfigsInputSchema';
import { OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema } from './OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { OrganizationCreateOrConnectWithoutMcpServerConfigsInputSchema } from './OrganizationCreateOrConnectWithoutMcpServerConfigsInputSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';

export const OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.OrganizationCreateNestedOneWithoutMcpServerConfigsInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationCreateOrConnectWithoutMcpServerConfigsInputSchema).optional(),
  connect: z.lazy(() => OrganizationWhereUniqueInputSchema).optional()
}).strict();

export default OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema;
