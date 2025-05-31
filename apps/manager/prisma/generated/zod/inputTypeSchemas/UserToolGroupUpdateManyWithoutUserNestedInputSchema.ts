import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateWithoutUserInputSchema } from './UserToolGroupCreateWithoutUserInputSchema';
import { UserToolGroupUncheckedCreateWithoutUserInputSchema } from './UserToolGroupUncheckedCreateWithoutUserInputSchema';
import { UserToolGroupCreateOrConnectWithoutUserInputSchema } from './UserToolGroupCreateOrConnectWithoutUserInputSchema';
import { UserToolGroupUpsertWithWhereUniqueWithoutUserInputSchema } from './UserToolGroupUpsertWithWhereUniqueWithoutUserInputSchema';
import { UserToolGroupCreateManyUserInputEnvelopeSchema } from './UserToolGroupCreateManyUserInputEnvelopeSchema';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupUpdateWithWhereUniqueWithoutUserInputSchema } from './UserToolGroupUpdateWithWhereUniqueWithoutUserInputSchema';
import { UserToolGroupUpdateManyWithWhereWithoutUserInputSchema } from './UserToolGroupUpdateManyWithWhereWithoutUserInputSchema';
import { UserToolGroupScalarWhereInputSchema } from './UserToolGroupScalarWhereInputSchema';

export const UserToolGroupUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.UserToolGroupUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutUserInputSchema),z.lazy(() => UserToolGroupCreateWithoutUserInputSchema).array(),z.lazy(() => UserToolGroupUncheckedCreateWithoutUserInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserToolGroupCreateOrConnectWithoutUserInputSchema),z.lazy(() => UserToolGroupCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserToolGroupUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => UserToolGroupUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserToolGroupCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserToolGroupWhereUniqueInputSchema),z.lazy(() => UserToolGroupWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserToolGroupWhereUniqueInputSchema),z.lazy(() => UserToolGroupWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserToolGroupWhereUniqueInputSchema),z.lazy(() => UserToolGroupWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserToolGroupWhereUniqueInputSchema),z.lazy(() => UserToolGroupWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserToolGroupUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => UserToolGroupUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserToolGroupUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => UserToolGroupUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserToolGroupScalarWhereInputSchema),z.lazy(() => UserToolGroupScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserToolGroupUpdateManyWithoutUserNestedInputSchema;
