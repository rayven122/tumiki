import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolScalarWhereInputSchema } from './UserToolGroupToolScalarWhereInputSchema';
import { UserToolGroupToolUpdateManyMutationInputSchema } from './UserToolGroupToolUpdateManyMutationInputSchema';
import { UserToolGroupToolUncheckedUpdateManyWithoutToolInputSchema } from './UserToolGroupToolUncheckedUpdateManyWithoutToolInputSchema';

export const UserToolGroupToolUpdateManyWithWhereWithoutToolInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateManyWithWhereWithoutToolInput> = z.object({
  where: z.lazy(() => UserToolGroupToolScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserToolGroupToolUpdateManyMutationInputSchema),z.lazy(() => UserToolGroupToolUncheckedUpdateManyWithoutToolInputSchema) ]),
}).strict();

export default UserToolGroupToolUpdateManyWithWhereWithoutToolInputSchema;
