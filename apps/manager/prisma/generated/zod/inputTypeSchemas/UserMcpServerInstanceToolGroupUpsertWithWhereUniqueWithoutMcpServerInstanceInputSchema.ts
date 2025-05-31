import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from './UserMcpServerInstanceToolGroupWhereUniqueInputSchema';
import { UserMcpServerInstanceToolGroupUpdateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUpdateWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema';

export const UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutMcpServerInstanceInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpdateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema) ]),
}).strict();

export default UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutMcpServerInstanceInputSchema;
