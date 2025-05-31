import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationUpdateWithoutMcpServerInstancesInputSchema } from './OrganizationUpdateWithoutMcpServerInstancesInputSchema';
import { OrganizationUncheckedUpdateWithoutMcpServerInstancesInputSchema } from './OrganizationUncheckedUpdateWithoutMcpServerInstancesInputSchema';

export const OrganizationUpdateToOneWithWhereWithoutMcpServerInstancesInputSchema: z.ZodType<Prisma.OrganizationUpdateToOneWithWhereWithoutMcpServerInstancesInput> = z.object({
  where: z.lazy(() => OrganizationWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrganizationUpdateWithoutMcpServerInstancesInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutMcpServerInstancesInputSchema) ]),
}).strict();

export default OrganizationUpdateToOneWithWhereWithoutMcpServerInstancesInputSchema;
