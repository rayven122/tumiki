import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigCreateOrConnectWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigCreateOrConnectWithoutUserToolGroupToolsInputSchema';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';

export const UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutUserToolGroupToolsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutUserToolGroupToolsInputSchema).optional(),
  connect: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).optional()
}).strict();

export default UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema;
