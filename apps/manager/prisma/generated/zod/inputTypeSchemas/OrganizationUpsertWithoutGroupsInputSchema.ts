import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationUpdateWithoutGroupsInputSchema } from './OrganizationUpdateWithoutGroupsInputSchema';
import { OrganizationUncheckedUpdateWithoutGroupsInputSchema } from './OrganizationUncheckedUpdateWithoutGroupsInputSchema';
import { OrganizationCreateWithoutGroupsInputSchema } from './OrganizationCreateWithoutGroupsInputSchema';
import { OrganizationUncheckedCreateWithoutGroupsInputSchema } from './OrganizationUncheckedCreateWithoutGroupsInputSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';

export const OrganizationUpsertWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationUpsertWithoutGroupsInput> = z.object({
  update: z.union([ z.lazy(() => OrganizationUpdateWithoutGroupsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutGroupsInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutGroupsInputSchema) ]),
  where: z.lazy(() => OrganizationWhereInputSchema).optional()
}).strict();

export default OrganizationUpsertWithoutGroupsInputSchema;
