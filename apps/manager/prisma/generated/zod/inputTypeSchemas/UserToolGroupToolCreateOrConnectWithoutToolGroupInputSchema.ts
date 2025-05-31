import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolCreateWithoutToolGroupInputSchema } from './UserToolGroupToolCreateWithoutToolGroupInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema } from './UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema';

export const UserToolGroupToolCreateOrConnectWithoutToolGroupInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateOrConnectWithoutToolGroupInput> = z.object({
  where: z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema) ]),
}).strict();

export default UserToolGroupToolCreateOrConnectWithoutToolGroupInputSchema;
