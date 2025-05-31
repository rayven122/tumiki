import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema';

export const UserMcpServerConfigCreateOrConnectWithoutUserToolGroupToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateOrConnectWithoutUserToolGroupToolsInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema) ]),
}).strict();

export default UserMcpServerConfigCreateOrConnectWithoutUserToolGroupToolsInputSchema;
