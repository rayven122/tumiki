import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupCreateWithoutUserInputSchema } from './UserToolGroupCreateWithoutUserInputSchema';
import { UserToolGroupUncheckedCreateWithoutUserInputSchema } from './UserToolGroupUncheckedCreateWithoutUserInputSchema';

export const UserToolGroupCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.UserToolGroupCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutUserInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export default UserToolGroupCreateOrConnectWithoutUserInputSchema;
