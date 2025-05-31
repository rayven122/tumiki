import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithoutToolsInputSchema } from './UserMcpServerConfigUpdateWithoutToolsInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutToolsInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutToolsInputSchema';

export const UserMcpServerConfigUpdateWithWhereUniqueWithoutToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateWithWhereUniqueWithoutToolsInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutToolsInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpdateWithWhereUniqueWithoutToolsInputSchema;
