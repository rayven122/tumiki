import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';

export const UserMcpServerInstanceCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateNestedOneWithoutMcpServerInstanceToolGroupsInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutMcpServerInstanceToolGroupsInputSchema).optional(),
  connect: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).optional()
}).strict();

export default UserMcpServerInstanceCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema;
