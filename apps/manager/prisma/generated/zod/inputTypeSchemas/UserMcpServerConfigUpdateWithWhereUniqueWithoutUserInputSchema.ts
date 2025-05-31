import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithoutUserInputSchema } from './UserMcpServerConfigUpdateWithoutUserInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutUserInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutUserInputSchema';

export const UserMcpServerConfigUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpdateWithWhereUniqueWithoutUserInputSchema;
