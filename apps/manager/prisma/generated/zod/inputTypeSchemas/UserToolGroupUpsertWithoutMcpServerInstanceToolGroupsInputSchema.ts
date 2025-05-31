import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUpdateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';

export const UserToolGroupUpsertWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserToolGroupUpsertWithoutMcpServerInstanceToolGroupsInput> = z.object({
  update: z.union([ z.lazy(() => UserToolGroupUpdateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema) ]),
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema) ]),
  where: z.lazy(() => UserToolGroupWhereInputSchema).optional()
}).strict();

export default UserToolGroupUpsertWithoutMcpServerInstanceToolGroupsInputSchema;
