import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupUpsertWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUpsertWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUpdateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema';

export const UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema: z.ZodType<Prisma.UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserToolGroupCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema).optional(),
  upsert: z.lazy(() => UserToolGroupUpsertWithoutMcpServerInstanceToolGroupsInputSchema).optional(),
  connect: z.lazy(() => UserToolGroupWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserToolGroupUpdateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema) ]).optional(),
}).strict();

export default UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceToolGroupsNestedInputSchema;
