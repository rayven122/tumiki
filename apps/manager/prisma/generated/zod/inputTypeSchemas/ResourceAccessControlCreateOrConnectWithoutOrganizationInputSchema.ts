import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlCreateWithoutOrganizationInputSchema } from './ResourceAccessControlCreateWithoutOrganizationInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema } from './ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema';

export const ResourceAccessControlCreateOrConnectWithoutOrganizationInputSchema: z.ZodType<Prisma.ResourceAccessControlCreateOrConnectWithoutOrganizationInput> = z.object({
  where: z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default ResourceAccessControlCreateOrConnectWithoutOrganizationInputSchema;
