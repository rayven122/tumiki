import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from './UserMcpServerInstanceToolGroupWhereUniqueInputSchema';
import { UserMcpServerInstanceToolGroupUpdateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUpdateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedUpdateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUncheckedUpdateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema';

export const UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutToolGroupInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpdateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedUpdateWithoutToolGroupInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema) ]),
}).strict();

export default UserMcpServerInstanceToolGroupUpsertWithWhereUniqueWithoutToolGroupInputSchema;
