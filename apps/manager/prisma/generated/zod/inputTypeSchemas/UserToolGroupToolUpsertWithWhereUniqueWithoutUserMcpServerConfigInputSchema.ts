import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';
import { UserToolGroupToolUpdateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUpdateWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolUncheckedUpdateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUncheckedUpdateWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema';

export const UserToolGroupToolUpsertWithWhereUniqueWithoutUserMcpServerConfigInputSchema: z.ZodType<Prisma.UserToolGroupToolUpsertWithWhereUniqueWithoutUserMcpServerConfigInput> = z.object({
  where: z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserToolGroupToolUpdateWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolUncheckedUpdateWithoutUserMcpServerConfigInputSchema) ]),
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema) ]),
}).strict();

export default UserToolGroupToolUpsertWithWhereUniqueWithoutUserMcpServerConfigInputSchema;
