import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlCreateWithoutMemberInputSchema } from './ResourceAccessControlCreateWithoutMemberInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutMemberInputSchema } from './ResourceAccessControlUncheckedCreateWithoutMemberInputSchema';
import { ResourceAccessControlCreateOrConnectWithoutMemberInputSchema } from './ResourceAccessControlCreateOrConnectWithoutMemberInputSchema';
import { ResourceAccessControlUpsertWithWhereUniqueWithoutMemberInputSchema } from './ResourceAccessControlUpsertWithWhereUniqueWithoutMemberInputSchema';
import { ResourceAccessControlCreateManyMemberInputEnvelopeSchema } from './ResourceAccessControlCreateManyMemberInputEnvelopeSchema';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlUpdateWithWhereUniqueWithoutMemberInputSchema } from './ResourceAccessControlUpdateWithWhereUniqueWithoutMemberInputSchema';
import { ResourceAccessControlUpdateManyWithWhereWithoutMemberInputSchema } from './ResourceAccessControlUpdateManyWithWhereWithoutMemberInputSchema';
import { ResourceAccessControlScalarWhereInputSchema } from './ResourceAccessControlScalarWhereInputSchema';

export const ResourceAccessControlUpdateManyWithoutMemberNestedInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateManyWithoutMemberNestedInput> = z.object({
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlCreateWithoutMemberInputSchema).array(),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutMemberInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ResourceAccessControlCreateOrConnectWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlCreateOrConnectWithoutMemberInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ResourceAccessControlUpsertWithWhereUniqueWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlUpsertWithWhereUniqueWithoutMemberInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ResourceAccessControlCreateManyMemberInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ResourceAccessControlUpdateWithWhereUniqueWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlUpdateWithWhereUniqueWithoutMemberInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ResourceAccessControlUpdateManyWithWhereWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlUpdateManyWithWhereWithoutMemberInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ResourceAccessControlScalarWhereInputSchema),z.lazy(() => ResourceAccessControlScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default ResourceAccessControlUpdateManyWithoutMemberNestedInputSchema;
