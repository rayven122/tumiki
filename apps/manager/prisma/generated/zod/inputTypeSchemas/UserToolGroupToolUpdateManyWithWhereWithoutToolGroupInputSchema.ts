import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolScalarWhereInputSchema } from './UserToolGroupToolScalarWhereInputSchema';
import { UserToolGroupToolUpdateManyMutationInputSchema } from './UserToolGroupToolUpdateManyMutationInputSchema';
import { UserToolGroupToolUncheckedUpdateManyWithoutToolGroupInputSchema } from './UserToolGroupToolUncheckedUpdateManyWithoutToolGroupInputSchema';

export const UserToolGroupToolUpdateManyWithWhereWithoutToolGroupInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateManyWithWhereWithoutToolGroupInput> = z.object({
  where: z.lazy(() => UserToolGroupToolScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserToolGroupToolUpdateManyMutationInputSchema),z.lazy(() => UserToolGroupToolUncheckedUpdateManyWithoutToolGroupInputSchema) ]),
}).strict();

export default UserToolGroupToolUpdateManyWithWhereWithoutToolGroupInputSchema;
