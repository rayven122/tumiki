import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from './UserMcpServerInstanceToolGroupWhereUniqueInputSchema';
import { UserMcpServerInstanceToolGroupUpdateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUpdateWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema';

export const UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutMcpServerInstanceInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpdateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema) ]),
}).strict();

export default UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutMcpServerInstanceInputSchema;
