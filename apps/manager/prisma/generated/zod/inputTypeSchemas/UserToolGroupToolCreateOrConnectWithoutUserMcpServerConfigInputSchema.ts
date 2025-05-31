import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema';

export const UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInput> = z.object({
  where: z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema) ]),
}).strict();

export default UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInputSchema;
