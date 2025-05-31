import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithoutMcpServerInputSchema } from './UserMcpServerConfigUpdateWithoutMcpServerInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutMcpServerInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutMcpServerInputSchema';

export const UserMcpServerConfigUpdateWithWhereUniqueWithoutMcpServerInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateWithWhereUniqueWithoutMcpServerInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutMcpServerInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpdateWithWhereUniqueWithoutMcpServerInputSchema;
