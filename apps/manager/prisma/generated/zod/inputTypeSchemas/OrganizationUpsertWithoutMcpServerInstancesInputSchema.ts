import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationUpdateWithoutMcpServerInstancesInputSchema } from './OrganizationUpdateWithoutMcpServerInstancesInputSchema';
import { OrganizationUncheckedUpdateWithoutMcpServerInstancesInputSchema } from './OrganizationUncheckedUpdateWithoutMcpServerInstancesInputSchema';
import { OrganizationCreateWithoutMcpServerInstancesInputSchema } from './OrganizationCreateWithoutMcpServerInstancesInputSchema';
import { OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema } from './OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';

export const OrganizationUpsertWithoutMcpServerInstancesInputSchema: z.ZodType<Prisma.OrganizationUpsertWithoutMcpServerInstancesInput> = z.object({
  update: z.union([ z.lazy(() => OrganizationUpdateWithoutMcpServerInstancesInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutMcpServerInstancesInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutMcpServerInstancesInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema) ]),
  where: z.lazy(() => OrganizationWhereInputSchema).optional()
}).strict();

export default OrganizationUpsertWithoutMcpServerInstancesInputSchema;
