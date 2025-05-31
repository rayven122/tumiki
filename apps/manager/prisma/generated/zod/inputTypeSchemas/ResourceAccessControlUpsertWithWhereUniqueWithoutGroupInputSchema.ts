import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlUpdateWithoutGroupInputSchema } from './ResourceAccessControlUpdateWithoutGroupInputSchema';
import { ResourceAccessControlUncheckedUpdateWithoutGroupInputSchema } from './ResourceAccessControlUncheckedUpdateWithoutGroupInputSchema';
import { ResourceAccessControlCreateWithoutGroupInputSchema } from './ResourceAccessControlCreateWithoutGroupInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutGroupInputSchema } from './ResourceAccessControlUncheckedCreateWithoutGroupInputSchema';

export const ResourceAccessControlUpsertWithWhereUniqueWithoutGroupInputSchema: z.ZodType<Prisma.ResourceAccessControlUpsertWithWhereUniqueWithoutGroupInput> = z.object({
  where: z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ResourceAccessControlUpdateWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlUncheckedUpdateWithoutGroupInputSchema) ]),
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutGroupInputSchema) ]),
}).strict();

export default ResourceAccessControlUpsertWithWhereUniqueWithoutGroupInputSchema;
