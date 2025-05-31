import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigScalarWhereInputSchema } from './UserMcpServerConfigScalarWhereInputSchema';
import { UserMcpServerConfigUpdateManyMutationInputSchema } from './UserMcpServerConfigUpdateManyMutationInputSchema';
import { UserMcpServerConfigUncheckedUpdateManyWithoutMcpServerInputSchema } from './UserMcpServerConfigUncheckedUpdateManyWithoutMcpServerInputSchema';

export const UserMcpServerConfigUpdateManyWithWhereWithoutMcpServerInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateManyWithWhereWithoutMcpServerInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerConfigUpdateManyMutationInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateManyWithoutMcpServerInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpdateManyWithWhereWithoutMcpServerInputSchema;
