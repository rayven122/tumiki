import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateWithoutMcpServerInstanceInputSchema } from './UserToolGroupCreateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema } from './UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema } from './UserToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema';
import { UserToolGroupUpsertWithoutMcpServerInstanceInputSchema } from './UserToolGroupUpsertWithoutMcpServerInstanceInputSchema';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceInputSchema } from './UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceInputSchema';
import { UserToolGroupUpdateWithoutMcpServerInstanceInputSchema } from './UserToolGroupUpdateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema } from './UserToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema';

export const UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceNestedInputSchema: z.ZodType<Prisma.UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema).optional(),
  upsert: z.lazy(() => UserToolGroupUpsertWithoutMcpServerInstanceInputSchema).optional(),
  connect: z.lazy(() => UserToolGroupWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceInputSchema),z.lazy(() => UserToolGroupUpdateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema) ]).optional(),
}).strict();

export default UserToolGroupUpdateOneRequiredWithoutMcpServerInstanceNestedInputSchema;
