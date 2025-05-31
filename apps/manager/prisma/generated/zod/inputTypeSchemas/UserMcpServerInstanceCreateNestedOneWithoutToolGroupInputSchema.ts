import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceCreateOrConnectWithoutToolGroupInputSchema } from './UserMcpServerInstanceCreateOrConnectWithoutToolGroupInputSchema';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';

export const UserMcpServerInstanceCreateNestedOneWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateNestedOneWithoutToolGroupInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutToolGroupInputSchema).optional(),
  connect: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).optional()
}).strict();

export default UserMcpServerInstanceCreateNestedOneWithoutToolGroupInputSchema;
