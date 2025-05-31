import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationUpdateWithoutToolGroupsInputSchema } from './OrganizationUpdateWithoutToolGroupsInputSchema';
import { OrganizationUncheckedUpdateWithoutToolGroupsInputSchema } from './OrganizationUncheckedUpdateWithoutToolGroupsInputSchema';

export const OrganizationUpdateToOneWithWhereWithoutToolGroupsInputSchema: z.ZodType<Prisma.OrganizationUpdateToOneWithWhereWithoutToolGroupsInput> = z.object({
  where: z.lazy(() => OrganizationWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrganizationUpdateWithoutToolGroupsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutToolGroupsInputSchema) ]),
}).strict();

export default OrganizationUpdateToOneWithWhereWithoutToolGroupsInputSchema;
