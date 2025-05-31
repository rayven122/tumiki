import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema';

export const UserMcpServerInstanceCreateOrConnectWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateOrConnectWithoutToolGroupInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema) ]),
}).strict();

export default UserMcpServerInstanceCreateOrConnectWithoutToolGroupInputSchema;
