import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithoutUserInputSchema } from './UserMcpServerConfigUpdateWithoutUserInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutUserInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutUserInputSchema';
import { UserMcpServerConfigCreateWithoutUserInputSchema } from './UserMcpServerConfigCreateWithoutUserInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutUserInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutUserInputSchema';

export const UserMcpServerConfigUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpsertWithWhereUniqueWithoutUserInputSchema;
