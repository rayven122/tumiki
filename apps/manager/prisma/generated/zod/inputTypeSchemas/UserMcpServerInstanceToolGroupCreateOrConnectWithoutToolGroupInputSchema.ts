import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from './UserMcpServerInstanceToolGroupWhereUniqueInputSchema';
import { UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema';

export const UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema) ]),
}).strict();

export default UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInputSchema;
