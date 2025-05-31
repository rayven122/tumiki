import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema';

export const UserMcpServerInstanceCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateOrConnectWithoutMcpServerInstanceToolGroupsInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema) ]),
}).strict();

export default UserMcpServerInstanceCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema;
