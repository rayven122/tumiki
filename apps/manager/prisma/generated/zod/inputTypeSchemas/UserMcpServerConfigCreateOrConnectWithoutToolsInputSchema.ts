import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigCreateWithoutToolsInputSchema } from './UserMcpServerConfigCreateWithoutToolsInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema';

export const UserMcpServerConfigCreateOrConnectWithoutToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateOrConnectWithoutToolsInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema) ]),
}).strict();

export default UserMcpServerConfigCreateOrConnectWithoutToolsInputSchema;
