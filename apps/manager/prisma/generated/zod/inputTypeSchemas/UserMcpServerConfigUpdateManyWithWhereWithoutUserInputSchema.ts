import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigScalarWhereInputSchema } from './UserMcpServerConfigScalarWhereInputSchema';
import { UserMcpServerConfigUpdateManyMutationInputSchema } from './UserMcpServerConfigUpdateManyMutationInputSchema';
import { UserMcpServerConfigUncheckedUpdateManyWithoutUserInputSchema } from './UserMcpServerConfigUncheckedUpdateManyWithoutUserInputSchema';

export const UserMcpServerConfigUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerConfigUpdateManyMutationInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpdateManyWithWhereWithoutUserInputSchema;
