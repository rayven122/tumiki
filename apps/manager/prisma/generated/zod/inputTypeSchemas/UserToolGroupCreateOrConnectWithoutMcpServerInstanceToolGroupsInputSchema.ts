import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema';

export const UserToolGroupCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserToolGroupCreateOrConnectWithoutMcpServerInstanceToolGroupsInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema) ]),
}).strict();

export default UserToolGroupCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema;
