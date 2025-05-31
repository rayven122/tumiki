import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlUpdateWithoutOrganizationInputSchema } from './ResourceAccessControlUpdateWithoutOrganizationInputSchema';
import { ResourceAccessControlUncheckedUpdateWithoutOrganizationInputSchema } from './ResourceAccessControlUncheckedUpdateWithoutOrganizationInputSchema';
import { ResourceAccessControlCreateWithoutOrganizationInputSchema } from './ResourceAccessControlCreateWithoutOrganizationInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema } from './ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema';

export const ResourceAccessControlUpsertWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.ResourceAccessControlUpsertWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ResourceAccessControlUpdateWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlUncheckedUpdateWithoutOrganizationInputSchema) ]),
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default ResourceAccessControlUpsertWithWhereUniqueWithoutOrganizationInputSchema;
