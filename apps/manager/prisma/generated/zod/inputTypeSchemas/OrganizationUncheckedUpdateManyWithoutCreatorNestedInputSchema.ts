import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutCreatorInputSchema } from './OrganizationCreateWithoutCreatorInputSchema';
import { OrganizationUncheckedCreateWithoutCreatorInputSchema } from './OrganizationUncheckedCreateWithoutCreatorInputSchema';
import { OrganizationCreateOrConnectWithoutCreatorInputSchema } from './OrganizationCreateOrConnectWithoutCreatorInputSchema';
import { OrganizationUpsertWithWhereUniqueWithoutCreatorInputSchema } from './OrganizationUpsertWithWhereUniqueWithoutCreatorInputSchema';
import { OrganizationCreateManyCreatorInputEnvelopeSchema } from './OrganizationCreateManyCreatorInputEnvelopeSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationUpdateWithWhereUniqueWithoutCreatorInputSchema } from './OrganizationUpdateWithWhereUniqueWithoutCreatorInputSchema';
import { OrganizationUpdateManyWithWhereWithoutCreatorInputSchema } from './OrganizationUpdateManyWithWhereWithoutCreatorInputSchema';
import { OrganizationScalarWhereInputSchema } from './OrganizationScalarWhereInputSchema';

export const OrganizationUncheckedUpdateManyWithoutCreatorNestedInputSchema: z.ZodType<Prisma.OrganizationUncheckedUpdateManyWithoutCreatorNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutCreatorInputSchema),z.lazy(() => OrganizationCreateWithoutCreatorInputSchema).array(),z.lazy(() => OrganizationUncheckedCreateWithoutCreatorInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutCreatorInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationCreateOrConnectWithoutCreatorInputSchema),z.lazy(() => OrganizationCreateOrConnectWithoutCreatorInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationUpsertWithWhereUniqueWithoutCreatorInputSchema),z.lazy(() => OrganizationUpsertWithWhereUniqueWithoutCreatorInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationCreateManyCreatorInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrganizationWhereUniqueInputSchema),z.lazy(() => OrganizationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationWhereUniqueInputSchema),z.lazy(() => OrganizationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationWhereUniqueInputSchema),z.lazy(() => OrganizationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationWhereUniqueInputSchema),z.lazy(() => OrganizationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationUpdateWithWhereUniqueWithoutCreatorInputSchema),z.lazy(() => OrganizationUpdateWithWhereUniqueWithoutCreatorInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationUpdateManyWithWhereWithoutCreatorInputSchema),z.lazy(() => OrganizationUpdateManyWithWhereWithoutCreatorInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationScalarWhereInputSchema),z.lazy(() => OrganizationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationUncheckedUpdateManyWithoutCreatorNestedInputSchema;
