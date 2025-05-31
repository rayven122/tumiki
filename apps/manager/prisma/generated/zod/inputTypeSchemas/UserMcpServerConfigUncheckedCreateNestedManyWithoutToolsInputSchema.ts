import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateWithoutToolsInputSchema } from './UserMcpServerConfigCreateWithoutToolsInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema';
import { UserMcpServerConfigCreateOrConnectWithoutToolsInputSchema } from './UserMcpServerConfigCreateOrConnectWithoutToolsInputSchema';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';

export const UserMcpServerConfigUncheckedCreateNestedManyWithoutToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigUncheckedCreateNestedManyWithoutToolsInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigCreateWithoutToolsInputSchema).array(),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutToolsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutToolsInputSchema),z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutToolsInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerConfigUncheckedCreateNestedManyWithoutToolsInputSchema;
