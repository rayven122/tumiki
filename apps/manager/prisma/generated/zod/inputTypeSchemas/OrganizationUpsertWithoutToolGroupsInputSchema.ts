import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationUpdateWithoutToolGroupsInputSchema } from './OrganizationUpdateWithoutToolGroupsInputSchema';
import { OrganizationUncheckedUpdateWithoutToolGroupsInputSchema } from './OrganizationUncheckedUpdateWithoutToolGroupsInputSchema';
import { OrganizationCreateWithoutToolGroupsInputSchema } from './OrganizationCreateWithoutToolGroupsInputSchema';
import { OrganizationUncheckedCreateWithoutToolGroupsInputSchema } from './OrganizationUncheckedCreateWithoutToolGroupsInputSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';

export const OrganizationUpsertWithoutToolGroupsInputSchema: z.ZodType<Prisma.OrganizationUpsertWithoutToolGroupsInput> = z.object({
  update: z.union([ z.lazy(() => OrganizationUpdateWithoutToolGroupsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutToolGroupsInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutToolGroupsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutToolGroupsInputSchema) ]),
  where: z.lazy(() => OrganizationWhereInputSchema).optional()
}).strict();

export default OrganizationUpsertWithoutToolGroupsInputSchema;
