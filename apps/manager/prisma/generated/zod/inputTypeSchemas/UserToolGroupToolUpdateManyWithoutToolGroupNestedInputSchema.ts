import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolCreateWithoutToolGroupInputSchema } from './UserToolGroupToolCreateWithoutToolGroupInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema } from './UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema';
import { UserToolGroupToolCreateOrConnectWithoutToolGroupInputSchema } from './UserToolGroupToolCreateOrConnectWithoutToolGroupInputSchema';
import { UserToolGroupToolUpsertWithWhereUniqueWithoutToolGroupInputSchema } from './UserToolGroupToolUpsertWithWhereUniqueWithoutToolGroupInputSchema';
import { UserToolGroupToolCreateManyToolGroupInputEnvelopeSchema } from './UserToolGroupToolCreateManyToolGroupInputEnvelopeSchema';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolUpdateWithWhereUniqueWithoutToolGroupInputSchema } from './UserToolGroupToolUpdateWithWhereUniqueWithoutToolGroupInputSchema';
import { UserToolGroupToolUpdateManyWithWhereWithoutToolGroupInputSchema } from './UserToolGroupToolUpdateManyWithWhereWithoutToolGroupInputSchema';
import { UserToolGroupToolScalarWhereInputSchema } from './UserToolGroupToolScalarWhereInputSchema';

export const UserToolGroupToolUpdateManyWithoutToolGroupNestedInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateManyWithoutToolGroupNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolCreateWithoutToolGroupInputSchema).array(),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserToolGroupToolCreateOrConnectWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolCreateOrConnectWithoutToolGroupInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserToolGroupToolUpsertWithWhereUniqueWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolUpsertWithWhereUniqueWithoutToolGroupInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserToolGroupToolCreateManyToolGroupInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserToolGroupToolUpdateWithWhereUniqueWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolUpdateWithWhereUniqueWithoutToolGroupInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserToolGroupToolUpdateManyWithWhereWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolUpdateManyWithWhereWithoutToolGroupInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserToolGroupToolScalarWhereInputSchema),z.lazy(() => UserToolGroupToolScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserToolGroupToolUpdateManyWithoutToolGroupNestedInputSchema;
