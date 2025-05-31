import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputEnvelopeSchema } from './UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputEnvelopeSchema';
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from './UserMcpServerInstanceToolGroupWhereUniqueInputSchema';
import { UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupScalarWhereInputSchema } from './UserMcpServerInstanceToolGroupScalarWhereInputSchema';

export const UserMcpServerInstanceToolGroupUpdateManyWithoutMcpServerInstanceNestedInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpdateManyWithoutMcpServerInstanceNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema).array(),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutMcpServerInstanceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutMcpServerInstanceInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutMcpServerInstanceInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerInstanceToolGroupUpdateManyWithoutMcpServerInstanceNestedInputSchema;
