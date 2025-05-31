import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupUpdateWithoutUserInputSchema } from './UserToolGroupUpdateWithoutUserInputSchema';
import { UserToolGroupUncheckedUpdateWithoutUserInputSchema } from './UserToolGroupUncheckedUpdateWithoutUserInputSchema';

export const UserToolGroupUpdateWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.UserToolGroupUpdateWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserToolGroupUpdateWithoutUserInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutUserInputSchema) ]),
}).strict();

export default UserToolGroupUpdateWithWhereUniqueWithoutUserInputSchema;
