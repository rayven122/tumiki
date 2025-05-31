import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateWithoutUserInputSchema } from './UserMcpServerConfigCreateWithoutUserInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutUserInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutUserInputSchema';
import { UserMcpServerConfigCreateOrConnectWithoutUserInputSchema } from './UserMcpServerConfigCreateOrConnectWithoutUserInputSchema';
import { UserMcpServerConfigUpsertWithWhereUniqueWithoutUserInputSchema } from './UserMcpServerConfigUpsertWithWhereUniqueWithoutUserInputSchema';
import { UserMcpServerConfigCreateManyUserInputEnvelopeSchema } from './UserMcpServerConfigCreateManyUserInputEnvelopeSchema';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithWhereUniqueWithoutUserInputSchema } from './UserMcpServerConfigUpdateWithWhereUniqueWithoutUserInputSchema';
import { UserMcpServerConfigUpdateManyWithWhereWithoutUserInputSchema } from './UserMcpServerConfigUpdateManyWithWhereWithoutUserInputSchema';
import { UserMcpServerConfigScalarWhereInputSchema } from './UserMcpServerConfigScalarWhereInputSchema';

export const UserMcpServerConfigUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.UserMcpServerConfigUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigCreateWithoutUserInputSchema).array(),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserMcpServerConfigUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerConfigCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserMcpServerConfigUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserMcpServerConfigScalarWhereInputSchema),z.lazy(() => UserMcpServerConfigScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerConfigUncheckedUpdateManyWithoutUserNestedInputSchema;
