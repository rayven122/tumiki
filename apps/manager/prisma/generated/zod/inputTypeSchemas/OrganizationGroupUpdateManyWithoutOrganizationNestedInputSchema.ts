import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupCreateWithoutOrganizationInputSchema } from './OrganizationGroupCreateWithoutOrganizationInputSchema';
import { OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema';
import { OrganizationGroupCreateOrConnectWithoutOrganizationInputSchema } from './OrganizationGroupCreateOrConnectWithoutOrganizationInputSchema';
import { OrganizationGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema } from './OrganizationGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema';
import { OrganizationGroupCreateManyOrganizationInputEnvelopeSchema } from './OrganizationGroupCreateManyOrganizationInputEnvelopeSchema';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema } from './OrganizationGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema';
import { OrganizationGroupUpdateManyWithWhereWithoutOrganizationInputSchema } from './OrganizationGroupUpdateManyWithWhereWithoutOrganizationInputSchema';
import { OrganizationGroupScalarWhereInputSchema } from './OrganizationGroupScalarWhereInputSchema';

export const OrganizationGroupUpdateManyWithoutOrganizationNestedInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateManyWithoutOrganizationNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupCreateWithoutOrganizationInputSchema).array(),z.lazy(() => OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationGroupCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationGroupCreateManyOrganizationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationGroupUpdateManyWithWhereWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupUpdateManyWithWhereWithoutOrganizationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationGroupScalarWhereInputSchema),z.lazy(() => OrganizationGroupScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationGroupUpdateManyWithoutOrganizationNestedInputSchema;
