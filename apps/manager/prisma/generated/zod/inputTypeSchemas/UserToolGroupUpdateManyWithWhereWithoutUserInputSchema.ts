import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupScalarWhereInputSchema } from './UserToolGroupScalarWhereInputSchema';
import { UserToolGroupUpdateManyMutationInputSchema } from './UserToolGroupUpdateManyMutationInputSchema';
import { UserToolGroupUncheckedUpdateManyWithoutUserInputSchema } from './UserToolGroupUncheckedUpdateManyWithoutUserInputSchema';

export const UserToolGroupUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.UserToolGroupUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => UserToolGroupScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserToolGroupUpdateManyMutationInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export default UserToolGroupUpdateManyWithWhereWithoutUserInputSchema;
