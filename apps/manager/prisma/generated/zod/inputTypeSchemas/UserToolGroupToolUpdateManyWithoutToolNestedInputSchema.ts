import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolCreateWithoutToolInputSchema } from './UserToolGroupToolCreateWithoutToolInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutToolInputSchema } from './UserToolGroupToolUncheckedCreateWithoutToolInputSchema';
import { UserToolGroupToolCreateOrConnectWithoutToolInputSchema } from './UserToolGroupToolCreateOrConnectWithoutToolInputSchema';
import { UserToolGroupToolUpsertWithWhereUniqueWithoutToolInputSchema } from './UserToolGroupToolUpsertWithWhereUniqueWithoutToolInputSchema';
import { UserToolGroupToolCreateManyToolInputEnvelopeSchema } from './UserToolGroupToolCreateManyToolInputEnvelopeSchema';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolUpdateWithWhereUniqueWithoutToolInputSchema } from './UserToolGroupToolUpdateWithWhereUniqueWithoutToolInputSchema';
import { UserToolGroupToolUpdateManyWithWhereWithoutToolInputSchema } from './UserToolGroupToolUpdateManyWithWhereWithoutToolInputSchema';
import { UserToolGroupToolScalarWhereInputSchema } from './UserToolGroupToolScalarWhereInputSchema';

export const UserToolGroupToolUpdateManyWithoutToolNestedInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateManyWithoutToolNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutToolInputSchema),z.lazy(() => UserToolGroupToolCreateWithoutToolInputSchema).array(),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserToolGroupToolCreateOrConnectWithoutToolInputSchema),z.lazy(() => UserToolGroupToolCreateOrConnectWithoutToolInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserToolGroupToolUpsertWithWhereUniqueWithoutToolInputSchema),z.lazy(() => UserToolGroupToolUpsertWithWhereUniqueWithoutToolInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserToolGroupToolCreateManyToolInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserToolGroupToolUpdateWithWhereUniqueWithoutToolInputSchema),z.lazy(() => UserToolGroupToolUpdateWithWhereUniqueWithoutToolInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserToolGroupToolUpdateManyWithWhereWithoutToolInputSchema),z.lazy(() => UserToolGroupToolUpdateManyWithWhereWithoutToolInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserToolGroupToolScalarWhereInputSchema),z.lazy(() => UserToolGroupToolScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserToolGroupToolUpdateManyWithoutToolNestedInputSchema;
