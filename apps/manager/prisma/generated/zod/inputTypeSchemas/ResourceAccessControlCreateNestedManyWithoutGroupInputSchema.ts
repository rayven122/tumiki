import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlCreateWithoutGroupInputSchema } from './ResourceAccessControlCreateWithoutGroupInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutGroupInputSchema } from './ResourceAccessControlUncheckedCreateWithoutGroupInputSchema';
import { ResourceAccessControlCreateOrConnectWithoutGroupInputSchema } from './ResourceAccessControlCreateOrConnectWithoutGroupInputSchema';
import { ResourceAccessControlCreateManyGroupInputEnvelopeSchema } from './ResourceAccessControlCreateManyGroupInputEnvelopeSchema';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';

export const ResourceAccessControlCreateNestedManyWithoutGroupInputSchema: z.ZodType<Prisma.ResourceAccessControlCreateNestedManyWithoutGroupInput> = z.object({
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlCreateWithoutGroupInputSchema).array(),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutGroupInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ResourceAccessControlCreateOrConnectWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlCreateOrConnectWithoutGroupInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ResourceAccessControlCreateManyGroupInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default ResourceAccessControlCreateNestedManyWithoutGroupInputSchema;
