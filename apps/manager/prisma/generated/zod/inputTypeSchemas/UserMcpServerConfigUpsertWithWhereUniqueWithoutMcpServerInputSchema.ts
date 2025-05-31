import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithoutMcpServerInputSchema } from './UserMcpServerConfigUpdateWithoutMcpServerInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutMcpServerInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutMcpServerInputSchema';
import { UserMcpServerConfigCreateWithoutMcpServerInputSchema } from './UserMcpServerConfigCreateWithoutMcpServerInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema';

export const UserMcpServerConfigUpsertWithWhereUniqueWithoutMcpServerInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpsertWithWhereUniqueWithoutMcpServerInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutMcpServerInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpsertWithWhereUniqueWithoutMcpServerInputSchema;
