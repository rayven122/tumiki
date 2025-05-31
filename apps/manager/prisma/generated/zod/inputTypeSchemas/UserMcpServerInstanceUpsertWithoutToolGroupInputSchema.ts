import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceUpdateWithoutToolGroupInputSchema } from './UserMcpServerInstanceUpdateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceUncheckedUpdateWithoutToolGroupInputSchema } from './UserMcpServerInstanceUncheckedUpdateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';

export const UserMcpServerInstanceUpsertWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpsertWithoutToolGroupInput> = z.object({
  update: z.union([ z.lazy(() => UserMcpServerInstanceUpdateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateWithoutToolGroupInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema) ]),
  where: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional()
}).strict();

export default UserMcpServerInstanceUpsertWithoutToolGroupInputSchema;
