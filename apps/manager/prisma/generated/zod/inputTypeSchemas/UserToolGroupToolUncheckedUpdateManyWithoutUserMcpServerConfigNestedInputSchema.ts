import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolUpsertWithWhereUniqueWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUpsertWithWhereUniqueWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolCreateManyUserMcpServerConfigInputEnvelopeSchema } from './UserToolGroupToolCreateManyUserMcpServerConfigInputEnvelopeSchema';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolUpdateWithWhereUniqueWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUpdateWithWhereUniqueWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolUpdateManyWithWhereWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUpdateManyWithWhereWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolScalarWhereInputSchema } from './UserToolGroupToolScalarWhereInputSchema';

export const UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigNestedInputSchema: z.ZodType<Prisma.UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema).array(),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserToolGroupToolUpsertWithWhereUniqueWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolUpsertWithWhereUniqueWithoutUserMcpServerConfigInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserToolGroupToolCreateManyUserMcpServerConfigInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserToolGroupToolUpdateWithWhereUniqueWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolUpdateWithWhereUniqueWithoutUserMcpServerConfigInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserToolGroupToolUpdateManyWithWhereWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolUpdateManyWithWhereWithoutUserMcpServerConfigInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserToolGroupToolScalarWhereInputSchema),z.lazy(() => UserToolGroupToolScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigNestedInputSchema;
