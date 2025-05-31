import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationUpdateWithoutGroupsInputSchema } from './OrganizationUpdateWithoutGroupsInputSchema';
import { OrganizationUncheckedUpdateWithoutGroupsInputSchema } from './OrganizationUncheckedUpdateWithoutGroupsInputSchema';

export const OrganizationUpdateToOneWithWhereWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationUpdateToOneWithWhereWithoutGroupsInput> = z.object({
  where: z.lazy(() => OrganizationWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrganizationUpdateWithoutGroupsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutGroupsInputSchema) ]),
}).strict();

export default OrganizationUpdateToOneWithWhereWithoutGroupsInputSchema;
