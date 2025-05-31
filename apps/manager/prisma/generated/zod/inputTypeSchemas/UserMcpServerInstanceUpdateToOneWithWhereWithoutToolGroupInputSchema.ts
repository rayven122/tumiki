import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';
import { UserMcpServerInstanceUpdateWithoutToolGroupInputSchema } from './UserMcpServerInstanceUpdateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceUncheckedUpdateWithoutToolGroupInputSchema } from './UserMcpServerInstanceUncheckedUpdateWithoutToolGroupInputSchema';

export const UserMcpServerInstanceUpdateToOneWithWhereWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpdateToOneWithWhereWithoutToolGroupInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserMcpServerInstanceUpdateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateWithoutToolGroupInputSchema) ]),
}).strict();

export default UserMcpServerInstanceUpdateToOneWithWhereWithoutToolGroupInputSchema;
