import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlCreateWithoutOrganizationInputSchema } from './ResourceAccessControlCreateWithoutOrganizationInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema } from './ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema';
import { ResourceAccessControlCreateOrConnectWithoutOrganizationInputSchema } from './ResourceAccessControlCreateOrConnectWithoutOrganizationInputSchema';
import { ResourceAccessControlCreateManyOrganizationInputEnvelopeSchema } from './ResourceAccessControlCreateManyOrganizationInputEnvelopeSchema';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';

export const ResourceAccessControlUncheckedCreateNestedManyWithoutOrganizationInputSchema: z.ZodType<Prisma.ResourceAccessControlUncheckedCreateNestedManyWithoutOrganizationInput> = z.object({
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlCreateWithoutOrganizationInputSchema).array(),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ResourceAccessControlCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ResourceAccessControlCreateManyOrganizationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default ResourceAccessControlUncheckedCreateNestedManyWithoutOrganizationInputSchema;
