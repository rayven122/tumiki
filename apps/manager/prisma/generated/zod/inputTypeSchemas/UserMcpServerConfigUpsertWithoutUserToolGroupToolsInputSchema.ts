import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigUpdateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUpdateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigWhereInputSchema } from './UserMcpServerConfigWhereInputSchema';

export const UserMcpServerConfigUpsertWithoutUserToolGroupToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpsertWithoutUserToolGroupToolsInput> = z.object({
  update: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithoutUserToolGroupToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutUserToolGroupToolsInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema) ]),
  where: z.lazy(() => UserMcpServerConfigWhereInputSchema).optional()
}).strict();

export default UserMcpServerConfigUpsertWithoutUserToolGroupToolsInputSchema;
