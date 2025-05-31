import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateWithoutUserInputSchema } from './UserMcpServerInstanceCreateWithoutUserInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema';
import { UserMcpServerInstanceCreateOrConnectWithoutUserInputSchema } from './UserMcpServerInstanceCreateOrConnectWithoutUserInputSchema';
import { UserMcpServerInstanceUpsertWithWhereUniqueWithoutUserInputSchema } from './UserMcpServerInstanceUpsertWithWhereUniqueWithoutUserInputSchema';
import { UserMcpServerInstanceCreateManyUserInputEnvelopeSchema } from './UserMcpServerInstanceCreateManyUserInputEnvelopeSchema';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceUpdateWithWhereUniqueWithoutUserInputSchema } from './UserMcpServerInstanceUpdateWithWhereUniqueWithoutUserInputSchema';
import { UserMcpServerInstanceUpdateManyWithWhereWithoutUserInputSchema } from './UserMcpServerInstanceUpdateManyWithWhereWithoutUserInputSchema';
import { UserMcpServerInstanceScalarWhereInputSchema } from './UserMcpServerInstanceScalarWhereInputSchema';

export const UserMcpServerInstanceUncheckedUpdateManyWithoutUserNestedInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUncheckedUpdateManyWithoutUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceCreateWithoutUserInputSchema).array(),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserMcpServerInstanceUpsertWithWhereUniqueWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceUpsertWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerInstanceCreateManyUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserMcpServerInstanceUpdateWithWhereUniqueWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceUpdateWithWhereUniqueWithoutUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserMcpServerInstanceUpdateManyWithWhereWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceUpdateManyWithWhereWithoutUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema),z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerInstanceUncheckedUpdateManyWithoutUserNestedInputSchema;
