import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateWithoutOrganizationInputSchema } from './UserToolGroupCreateWithoutOrganizationInputSchema';
import { UserToolGroupUncheckedCreateWithoutOrganizationInputSchema } from './UserToolGroupUncheckedCreateWithoutOrganizationInputSchema';
import { UserToolGroupCreateOrConnectWithoutOrganizationInputSchema } from './UserToolGroupCreateOrConnectWithoutOrganizationInputSchema';
import { UserToolGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema } from './UserToolGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema';
import { UserToolGroupCreateManyOrganizationInputEnvelopeSchema } from './UserToolGroupCreateManyOrganizationInputEnvelopeSchema';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema } from './UserToolGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema';
import { UserToolGroupUpdateManyWithWhereWithoutOrganizationInputSchema } from './UserToolGroupUpdateManyWithWhereWithoutOrganizationInputSchema';
import { UserToolGroupScalarWhereInputSchema } from './UserToolGroupScalarWhereInputSchema';

export const UserToolGroupUncheckedUpdateManyWithoutOrganizationNestedInputSchema: z.ZodType<Prisma.UserToolGroupUncheckedUpdateManyWithoutOrganizationNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupCreateWithoutOrganizationInputSchema).array(),z.lazy(() => UserToolGroupUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserToolGroupCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserToolGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserToolGroupCreateManyOrganizationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserToolGroupWhereUniqueInputSchema),z.lazy(() => UserToolGroupWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserToolGroupWhereUniqueInputSchema),z.lazy(() => UserToolGroupWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserToolGroupWhereUniqueInputSchema),z.lazy(() => UserToolGroupWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserToolGroupWhereUniqueInputSchema),z.lazy(() => UserToolGroupWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserToolGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserToolGroupUpdateManyWithWhereWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupUpdateManyWithWhereWithoutOrganizationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserToolGroupScalarWhereInputSchema),z.lazy(() => UserToolGroupScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserToolGroupUncheckedUpdateManyWithoutOrganizationNestedInputSchema;
