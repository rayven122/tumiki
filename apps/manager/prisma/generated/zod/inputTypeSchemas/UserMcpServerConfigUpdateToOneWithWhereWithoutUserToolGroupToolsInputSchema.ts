import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereInputSchema } from './UserMcpServerConfigWhereInputSchema';
import { UserMcpServerConfigUpdateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUpdateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutUserToolGroupToolsInputSchema';

export const UserMcpServerConfigUpdateToOneWithWhereWithoutUserToolGroupToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateToOneWithWhereWithoutUserToolGroupToolsInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithoutUserToolGroupToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutUserToolGroupToolsInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpdateToOneWithWhereWithoutUserToolGroupToolsInputSchema;
