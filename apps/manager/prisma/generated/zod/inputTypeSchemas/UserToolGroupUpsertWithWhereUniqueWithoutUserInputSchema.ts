import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupUpdateWithoutUserInputSchema } from './UserToolGroupUpdateWithoutUserInputSchema';
import { UserToolGroupUncheckedUpdateWithoutUserInputSchema } from './UserToolGroupUncheckedUpdateWithoutUserInputSchema';
import { UserToolGroupCreateWithoutUserInputSchema } from './UserToolGroupCreateWithoutUserInputSchema';
import { UserToolGroupUncheckedCreateWithoutUserInputSchema } from './UserToolGroupUncheckedCreateWithoutUserInputSchema';

export const UserToolGroupUpsertWithWhereUniqueWithoutUserInputSchema: z.ZodType<Prisma.UserToolGroupUpsertWithWhereUniqueWithoutUserInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserToolGroupUpdateWithoutUserInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutUserInputSchema) ]),
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutUserInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export default UserToolGroupUpsertWithWhereUniqueWithoutUserInputSchema;
