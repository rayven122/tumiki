import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationUpdateWithoutMcpServerConfigsInputSchema } from './OrganizationUpdateWithoutMcpServerConfigsInputSchema';
import { OrganizationUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './OrganizationUncheckedUpdateWithoutMcpServerConfigsInputSchema';
import { OrganizationCreateWithoutMcpServerConfigsInputSchema } from './OrganizationCreateWithoutMcpServerConfigsInputSchema';
import { OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema } from './OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';

export const OrganizationUpsertWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.OrganizationUpsertWithoutMcpServerConfigsInput> = z.object({
  update: z.union([ z.lazy(() => OrganizationUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema) ]),
  where: z.lazy(() => OrganizationWhereInputSchema).optional()
}).strict();

export default OrganizationUpsertWithoutMcpServerConfigsInputSchema;
