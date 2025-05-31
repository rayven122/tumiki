import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlUpdateWithoutOrganizationInputSchema } from './ResourceAccessControlUpdateWithoutOrganizationInputSchema';
import { ResourceAccessControlUncheckedUpdateWithoutOrganizationInputSchema } from './ResourceAccessControlUncheckedUpdateWithoutOrganizationInputSchema';

export const ResourceAccessControlUpdateWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ResourceAccessControlUpdateWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlUncheckedUpdateWithoutOrganizationInputSchema) ]),
}).strict();

export default ResourceAccessControlUpdateWithWhereUniqueWithoutOrganizationInputSchema;
