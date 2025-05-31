import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolUpdateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUpdateWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolUncheckedUpdateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUncheckedUpdateWithoutUserMcpServerConfigInputSchema';

export const UserToolGroupToolUpdateWithWhereUniqueWithoutUserMcpServerConfigInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateWithWhereUniqueWithoutUserMcpServerConfigInput> = z.object({
  where: z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserToolGroupToolUpdateWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolUncheckedUpdateWithoutUserMcpServerConfigInputSchema) ]),
}).strict();

export default UserToolGroupToolUpdateWithWhereUniqueWithoutUserMcpServerConfigInputSchema;
