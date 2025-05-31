import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateWithoutMcpServerInstanceInputSchema } from './UserToolGroupCreateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema } from './UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema } from './UserToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';

export const UserToolGroupCreateNestedOneWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserToolGroupCreateNestedOneWithoutMcpServerInstanceInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema).optional(),
  connect: z.lazy(() => UserToolGroupWhereUniqueInputSchema).optional()
}).strict();

export default UserToolGroupCreateNestedOneWithoutMcpServerInstanceInputSchema;
