import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlUpdateWithoutGroupInputSchema } from './ResourceAccessControlUpdateWithoutGroupInputSchema';
import { ResourceAccessControlUncheckedUpdateWithoutGroupInputSchema } from './ResourceAccessControlUncheckedUpdateWithoutGroupInputSchema';

export const ResourceAccessControlUpdateWithWhereUniqueWithoutGroupInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateWithWhereUniqueWithoutGroupInput> = z.object({
  where: z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ResourceAccessControlUpdateWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlUncheckedUpdateWithoutGroupInputSchema) ]),
}).strict();

export default ResourceAccessControlUpdateWithWhereUniqueWithoutGroupInputSchema;
