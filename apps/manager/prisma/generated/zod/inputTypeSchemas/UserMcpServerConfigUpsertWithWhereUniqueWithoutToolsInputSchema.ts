import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithoutToolsInputSchema } from './UserMcpServerConfigUpdateWithoutToolsInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutToolsInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutToolsInputSchema';
import { UserMcpServerConfigCreateWithoutToolsInputSchema } from './UserMcpServerConfigCreateWithoutToolsInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema';

export const UserMcpServerConfigUpsertWithWhereUniqueWithoutToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpsertWithWhereUniqueWithoutToolsInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutToolsInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpsertWithWhereUniqueWithoutToolsInputSchema;
