import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceUpdateWithoutUserInputSchema } from './UserMcpServerInstanceUpdateWithoutUserInputSchema';
import { UserMcpServerInstanceUncheckedUpdateWithoutUserInputSchema } from './UserMcpServerInstanceUncheckedUpdateWithoutUserInputSchema';
import { UserMcpServerInstanceCreateWithoutUserInputSchema } from './UserMcpServerInstanceCreateWithoutUserInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema';

export const UserMcpServerInstanceUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserMcpServerInstanceUpdateWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export default UserMcpServerInstanceUpsertWithWhereUniqueWithoutUserInputSchema;
