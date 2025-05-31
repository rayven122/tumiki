import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolUpdateWithoutToolGroupInputSchema } from './UserToolGroupToolUpdateWithoutToolGroupInputSchema';
import { UserToolGroupToolUncheckedUpdateWithoutToolGroupInputSchema } from './UserToolGroupToolUncheckedUpdateWithoutToolGroupInputSchema';
import { UserToolGroupToolCreateWithoutToolGroupInputSchema } from './UserToolGroupToolCreateWithoutToolGroupInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema } from './UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema';

export const UserToolGroupToolUpsertWithWhereUniqueWithoutToolGroupInputSchema: z.ZodType<Prisma.UserToolGroupToolUpsertWithWhereUniqueWithoutToolGroupInput> = z.object({
  where: z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserToolGroupToolUpdateWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolUncheckedUpdateWithoutToolGroupInputSchema) ]),
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema) ]),
}).strict();

export default UserToolGroupToolUpsertWithWhereUniqueWithoutToolGroupInputSchema;
