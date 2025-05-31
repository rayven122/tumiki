import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateWithoutToolsInputSchema } from './UserMcpServerConfigCreateWithoutToolsInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema';
import { UserMcpServerConfigCreateOrConnectWithoutToolsInputSchema } from './UserMcpServerConfigCreateOrConnectWithoutToolsInputSchema';
import { UserMcpServerConfigUpsertWithWhereUniqueWithoutToolsInputSchema } from './UserMcpServerConfigUpsertWithWhereUniqueWithoutToolsInputSchema';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithWhereUniqueWithoutToolsInputSchema } from './UserMcpServerConfigUpdateWithWhereUniqueWithoutToolsInputSchema';
import { UserMcpServerConfigUpdateManyWithWhereWithoutToolsInputSchema } from './UserMcpServerConfigUpdateManyWithWhereWithoutToolsInputSchema';
import { UserMcpServerConfigScalarWhereInputSchema } from './UserMcpServerConfigScalarWhereInputSchema';

export const UserMcpServerConfigUncheckedUpdateManyWithoutToolsNestedInputSchema: z.ZodType<Prisma.UserMcpServerConfigUncheckedUpdateManyWithoutToolsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigCreateWithoutToolsInputSchema).array(),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutToolsInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserMcpServerConfigUpsertWithWhereUniqueWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigUpsertWithWhereUniqueWithoutToolsInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithWhereUniqueWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigUpdateWithWhereUniqueWithoutToolsInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserMcpServerConfigUpdateManyWithWhereWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigUpdateManyWithWhereWithoutToolsInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserMcpServerConfigScalarWhereInputSchema),z.lazy(() => UserMcpServerConfigScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerConfigUncheckedUpdateManyWithoutToolsNestedInputSchema;
