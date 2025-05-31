import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlCreateWithoutGroupInputSchema } from './ResourceAccessControlCreateWithoutGroupInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutGroupInputSchema } from './ResourceAccessControlUncheckedCreateWithoutGroupInputSchema';

export const ResourceAccessControlCreateOrConnectWithoutGroupInputSchema: z.ZodType<Prisma.ResourceAccessControlCreateOrConnectWithoutGroupInput> = z.object({
  where: z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutGroupInputSchema) ]),
}).strict();

export default ResourceAccessControlCreateOrConnectWithoutGroupInputSchema;
