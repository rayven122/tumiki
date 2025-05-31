import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolScalarWhereInputSchema } from './UserToolGroupToolScalarWhereInputSchema';
import { UserToolGroupToolUpdateManyMutationInputSchema } from './UserToolGroupToolUpdateManyMutationInputSchema';
import { UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigInputSchema';

export const UserToolGroupToolUpdateManyWithWhereWithoutUserMcpServerConfigInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateManyWithWhereWithoutUserMcpServerConfigInput> = z.object({
  where: z.lazy(() => UserToolGroupToolScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserToolGroupToolUpdateManyMutationInputSchema),z.lazy(() => UserToolGroupToolUncheckedUpdateManyWithoutUserMcpServerConfigInputSchema) ]),
}).strict();

export default UserToolGroupToolUpdateManyWithWhereWithoutUserMcpServerConfigInputSchema;
