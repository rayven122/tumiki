import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateWithoutOrganizationInputSchema } from './OrganizationMemberCreateWithoutOrganizationInputSchema';
import { OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema';
import { OrganizationMemberCreateOrConnectWithoutOrganizationInputSchema } from './OrganizationMemberCreateOrConnectWithoutOrganizationInputSchema';
import { OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInputSchema } from './OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInputSchema';
import { OrganizationMemberCreateManyOrganizationInputEnvelopeSchema } from './OrganizationMemberCreateManyOrganizationInputEnvelopeSchema';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInputSchema } from './OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInputSchema';
import { OrganizationMemberUpdateManyWithWhereWithoutOrganizationInputSchema } from './OrganizationMemberUpdateManyWithWhereWithoutOrganizationInputSchema';
import { OrganizationMemberScalarWhereInputSchema } from './OrganizationMemberScalarWhereInputSchema';

export const OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInputSchema: z.ZodType<Prisma.OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberCreateWithoutOrganizationInputSchema).array(),z.lazy(() => OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationMemberCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberUpsertWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationMemberCreateManyOrganizationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationMemberUpdateManyWithWhereWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberUpdateManyWithWhereWithoutOrganizationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationMemberScalarWhereInputSchema),z.lazy(() => OrganizationMemberScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationMemberUncheckedUpdateManyWithoutOrganizationNestedInputSchema;
