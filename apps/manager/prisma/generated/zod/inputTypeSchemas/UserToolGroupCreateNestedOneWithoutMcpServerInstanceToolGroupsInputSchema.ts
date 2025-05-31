import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';

export const UserToolGroupCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserToolGroupCreateNestedOneWithoutMcpServerInstanceToolGroupsInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserToolGroupCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema).optional(),
  connect: z.lazy(() => UserToolGroupWhereUniqueInputSchema).optional()
}).strict();

export default UserToolGroupCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema;
