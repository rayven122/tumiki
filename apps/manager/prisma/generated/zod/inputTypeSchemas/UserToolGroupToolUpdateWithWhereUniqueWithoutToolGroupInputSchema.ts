import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolUpdateWithoutToolGroupInputSchema } from './UserToolGroupToolUpdateWithoutToolGroupInputSchema';
import { UserToolGroupToolUncheckedUpdateWithoutToolGroupInputSchema } from './UserToolGroupToolUncheckedUpdateWithoutToolGroupInputSchema';

export const UserToolGroupToolUpdateWithWhereUniqueWithoutToolGroupInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateWithWhereUniqueWithoutToolGroupInput> = z.object({
  where: z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserToolGroupToolUpdateWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolUncheckedUpdateWithoutToolGroupInputSchema) ]),
}).strict();

export default UserToolGroupToolUpdateWithWhereUniqueWithoutToolGroupInputSchema;
