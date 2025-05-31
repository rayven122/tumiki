import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlCreateWithoutGroupInputSchema } from './ResourceAccessControlCreateWithoutGroupInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutGroupInputSchema } from './ResourceAccessControlUncheckedCreateWithoutGroupInputSchema';
import { ResourceAccessControlCreateOrConnectWithoutGroupInputSchema } from './ResourceAccessControlCreateOrConnectWithoutGroupInputSchema';
import { ResourceAccessControlUpsertWithWhereUniqueWithoutGroupInputSchema } from './ResourceAccessControlUpsertWithWhereUniqueWithoutGroupInputSchema';
import { ResourceAccessControlCreateManyGroupInputEnvelopeSchema } from './ResourceAccessControlCreateManyGroupInputEnvelopeSchema';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlUpdateWithWhereUniqueWithoutGroupInputSchema } from './ResourceAccessControlUpdateWithWhereUniqueWithoutGroupInputSchema';
import { ResourceAccessControlUpdateManyWithWhereWithoutGroupInputSchema } from './ResourceAccessControlUpdateManyWithWhereWithoutGroupInputSchema';
import { ResourceAccessControlScalarWhereInputSchema } from './ResourceAccessControlScalarWhereInputSchema';

export const ResourceAccessControlUncheckedUpdateManyWithoutGroupNestedInputSchema: z.ZodType<Prisma.ResourceAccessControlUncheckedUpdateManyWithoutGroupNestedInput> = z.object({
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlCreateWithoutGroupInputSchema).array(),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutGroupInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ResourceAccessControlCreateOrConnectWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlCreateOrConnectWithoutGroupInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ResourceAccessControlUpsertWithWhereUniqueWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlUpsertWithWhereUniqueWithoutGroupInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ResourceAccessControlCreateManyGroupInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ResourceAccessControlUpdateWithWhereUniqueWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlUpdateWithWhereUniqueWithoutGroupInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ResourceAccessControlUpdateManyWithWhereWithoutGroupInputSchema),z.lazy(() => ResourceAccessControlUpdateManyWithWhereWithoutGroupInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ResourceAccessControlScalarWhereInputSchema),z.lazy(() => ResourceAccessControlScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default ResourceAccessControlUncheckedUpdateManyWithoutGroupNestedInputSchema;
