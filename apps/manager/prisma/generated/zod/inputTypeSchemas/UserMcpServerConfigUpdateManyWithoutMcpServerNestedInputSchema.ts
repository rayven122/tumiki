import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateWithoutMcpServerInputSchema } from './UserMcpServerConfigCreateWithoutMcpServerInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema';
import { UserMcpServerConfigCreateOrConnectWithoutMcpServerInputSchema } from './UserMcpServerConfigCreateOrConnectWithoutMcpServerInputSchema';
import { UserMcpServerConfigUpsertWithWhereUniqueWithoutMcpServerInputSchema } from './UserMcpServerConfigUpsertWithWhereUniqueWithoutMcpServerInputSchema';
import { UserMcpServerConfigCreateManyMcpServerInputEnvelopeSchema } from './UserMcpServerConfigCreateManyMcpServerInputEnvelopeSchema';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithWhereUniqueWithoutMcpServerInputSchema } from './UserMcpServerConfigUpdateWithWhereUniqueWithoutMcpServerInputSchema';
import { UserMcpServerConfigUpdateManyWithWhereWithoutMcpServerInputSchema } from './UserMcpServerConfigUpdateManyWithWhereWithoutMcpServerInputSchema';
import { UserMcpServerConfigScalarWhereInputSchema } from './UserMcpServerConfigScalarWhereInputSchema';

export const UserMcpServerConfigUpdateManyWithoutMcpServerNestedInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateManyWithoutMcpServerNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigCreateWithoutMcpServerInputSchema).array(),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutMcpServerInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserMcpServerConfigUpsertWithWhereUniqueWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigUpsertWithWhereUniqueWithoutMcpServerInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerConfigCreateManyMcpServerInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithWhereUniqueWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigUpdateWithWhereUniqueWithoutMcpServerInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserMcpServerConfigUpdateManyWithWhereWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigUpdateManyWithWhereWithoutMcpServerInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserMcpServerConfigScalarWhereInputSchema),z.lazy(() => UserMcpServerConfigScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerConfigUpdateManyWithoutMcpServerNestedInputSchema;
