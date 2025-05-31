import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlCreateWithoutOrganizationInputSchema } from './ResourceAccessControlCreateWithoutOrganizationInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema } from './ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema';
import { ResourceAccessControlCreateOrConnectWithoutOrganizationInputSchema } from './ResourceAccessControlCreateOrConnectWithoutOrganizationInputSchema';
import { ResourceAccessControlUpsertWithWhereUniqueWithoutOrganizationInputSchema } from './ResourceAccessControlUpsertWithWhereUniqueWithoutOrganizationInputSchema';
import { ResourceAccessControlCreateManyOrganizationInputEnvelopeSchema } from './ResourceAccessControlCreateManyOrganizationInputEnvelopeSchema';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlUpdateWithWhereUniqueWithoutOrganizationInputSchema } from './ResourceAccessControlUpdateWithWhereUniqueWithoutOrganizationInputSchema';
import { ResourceAccessControlUpdateManyWithWhereWithoutOrganizationInputSchema } from './ResourceAccessControlUpdateManyWithWhereWithoutOrganizationInputSchema';
import { ResourceAccessControlScalarWhereInputSchema } from './ResourceAccessControlScalarWhereInputSchema';

export const ResourceAccessControlUpdateManyWithoutOrganizationNestedInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateManyWithoutOrganizationNestedInput> = z.object({
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlCreateWithoutOrganizationInputSchema).array(),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ResourceAccessControlCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => ResourceAccessControlUpsertWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlUpsertWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ResourceAccessControlCreateManyOrganizationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => ResourceAccessControlUpdateWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlUpdateWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => ResourceAccessControlUpdateManyWithWhereWithoutOrganizationInputSchema),z.lazy(() => ResourceAccessControlUpdateManyWithWhereWithoutOrganizationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => ResourceAccessControlScalarWhereInputSchema),z.lazy(() => ResourceAccessControlScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default ResourceAccessControlUpdateManyWithoutOrganizationNestedInputSchema;
