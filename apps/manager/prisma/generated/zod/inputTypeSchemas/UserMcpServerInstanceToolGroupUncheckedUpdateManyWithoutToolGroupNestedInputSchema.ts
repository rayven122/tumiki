import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupCreateManyToolGroupInputEnvelopeSchema } from './UserMcpServerInstanceToolGroupCreateManyToolGroupInputEnvelopeSchema';
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from './UserMcpServerInstanceToolGroupWhereUniqueInputSchema';
import { UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupScalarWhereInputSchema } from './UserMcpServerInstanceToolGroupScalarWhereInputSchema';

export const UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupNestedInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema).array(),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutToolGroupInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerInstanceToolGroupCreateManyToolGroupInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutToolGroupInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutToolGroupInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupNestedInputSchema;
