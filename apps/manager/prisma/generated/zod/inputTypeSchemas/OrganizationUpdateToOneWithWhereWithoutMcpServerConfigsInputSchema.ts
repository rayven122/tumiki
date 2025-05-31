import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationUpdateWithoutMcpServerConfigsInputSchema } from './OrganizationUpdateWithoutMcpServerConfigsInputSchema';
import { OrganizationUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './OrganizationUncheckedUpdateWithoutMcpServerConfigsInputSchema';

export const OrganizationUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.OrganizationUpdateToOneWithWhereWithoutMcpServerConfigsInput> = z.object({
  where: z.lazy(() => OrganizationWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrganizationUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]),
}).strict();

export default OrganizationUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema;
