import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolUpdateWithoutToolInputSchema } from './UserToolGroupToolUpdateWithoutToolInputSchema';
import { UserToolGroupToolUncheckedUpdateWithoutToolInputSchema } from './UserToolGroupToolUncheckedUpdateWithoutToolInputSchema';

export const UserToolGroupToolUpdateWithWhereUniqueWithoutToolInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateWithWhereUniqueWithoutToolInput> = z.object({
  where: z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserToolGroupToolUpdateWithoutToolInputSchema),z.lazy(() => UserToolGroupToolUncheckedUpdateWithoutToolInputSchema) ]),
}).strict();

export default UserToolGroupToolUpdateWithWhereUniqueWithoutToolInputSchema;
