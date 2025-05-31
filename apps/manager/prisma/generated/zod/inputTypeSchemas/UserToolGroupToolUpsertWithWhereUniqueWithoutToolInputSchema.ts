import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolUpdateWithoutToolInputSchema } from './UserToolGroupToolUpdateWithoutToolInputSchema';
import { UserToolGroupToolUncheckedUpdateWithoutToolInputSchema } from './UserToolGroupToolUncheckedUpdateWithoutToolInputSchema';
import { UserToolGroupToolCreateWithoutToolInputSchema } from './UserToolGroupToolCreateWithoutToolInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutToolInputSchema } from './UserToolGroupToolUncheckedCreateWithoutToolInputSchema';

export const UserToolGroupToolUpsertWithWhereUniqueWithoutToolInputSchema: z.ZodType<Prisma.UserToolGroupToolUpsertWithWhereUniqueWithoutToolInput> = z.object({
  where: z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserToolGroupToolUpdateWithoutToolInputSchema),z.lazy(() => UserToolGroupToolUncheckedUpdateWithoutToolInputSchema) ]),
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutToolInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolInputSchema) ]),
}).strict();

export default UserToolGroupToolUpsertWithWhereUniqueWithoutToolInputSchema;
