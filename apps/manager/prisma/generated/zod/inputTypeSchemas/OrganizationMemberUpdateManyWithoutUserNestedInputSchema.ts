import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateWithoutUserInputSchema } from './OrganizationMemberCreateWithoutUserInputSchema';
import { OrganizationMemberUncheckedCreateWithoutUserInputSchema } from './OrganizationMemberUncheckedCreateWithoutUserInputSchema';
import { OrganizationMemberCreateOrConnectWithoutUserInputSchema } from './OrganizationMemberCreateOrConnectWithoutUserInputSchema';
import { OrganizationMemberUpsertWithWhereUniqueWithoutUserInputSchema } from './OrganizationMemberUpsertWithWhereUniqueWithoutUserInputSchema';
import { OrganizationMemberCreateManyUserInputEnvelopeSchema } from './OrganizationMemberCreateManyUserInputEnvelopeSchema';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithWhereUniqueWithoutUserInputSchema } from './OrganizationMemberUpdateWithWhereUniqueWithoutUserInputSchema';
import { OrganizationMemberUpdateManyWithWhereWithoutUserInputSchema } from './OrganizationMemberUpdateManyWithWhereWithoutUserInputSchema';
import { OrganizationMemberScalarWhereInputSchema } from './OrganizationMemberScalarWhereInputSchema';

export const OrganizationMemberUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutUserInputSchema),z.lazy(() => OrganizationMemberCreateWithoutUserInputSchema).array(),z.lazy(() => OrganizationMemberUncheckedCreateWithoutUserInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationMemberCreateOrConnectWithoutUserInputSchema),z.lazy(() => OrganizationMemberCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationMemberUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => OrganizationMemberUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationMemberCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationMemberUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => OrganizationMemberUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationMemberUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => OrganizationMemberUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationMemberScalarWhereInputSchema),z.lazy(() => OrganizationMemberScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationMemberUpdateManyWithoutUserNestedInputSchema;
