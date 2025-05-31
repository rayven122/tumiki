import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolCreateWithoutToolInputSchema } from './UserToolGroupToolCreateWithoutToolInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutToolInputSchema } from './UserToolGroupToolUncheckedCreateWithoutToolInputSchema';

export const UserToolGroupToolCreateOrConnectWithoutToolInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateOrConnectWithoutToolInput> = z.object({
  where: z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutToolInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolInputSchema) ]),
}).strict();

export default UserToolGroupToolCreateOrConnectWithoutToolInputSchema;
