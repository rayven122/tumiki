import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from './UserMcpServerInstanceToolGroupWhereUniqueInputSchema';
import { UserMcpServerInstanceToolGroupUpdateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUpdateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedUpdateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUncheckedUpdateWithoutToolGroupInputSchema';

export const UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutToolGroupInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpdateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedUpdateWithoutToolGroupInputSchema) ]),
}).strict();

export default UserMcpServerInstanceToolGroupUpdateWithWhereUniqueWithoutToolGroupInputSchema;
