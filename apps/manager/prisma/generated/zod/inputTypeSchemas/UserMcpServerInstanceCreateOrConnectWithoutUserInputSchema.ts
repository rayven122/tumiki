import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceCreateWithoutUserInputSchema } from './UserMcpServerInstanceCreateWithoutUserInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema';

export const UserMcpServerInstanceCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export default UserMcpServerInstanceCreateOrConnectWithoutUserInputSchema;
