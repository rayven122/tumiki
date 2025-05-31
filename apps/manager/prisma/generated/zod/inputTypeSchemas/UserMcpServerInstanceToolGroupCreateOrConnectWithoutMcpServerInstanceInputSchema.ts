import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from './UserMcpServerInstanceToolGroupWhereUniqueInputSchema';
import { UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema';

export const UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema) ]),
}).strict();

export default UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema;
