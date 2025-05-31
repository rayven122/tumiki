import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceScalarWhereInputSchema } from './UserMcpServerInstanceScalarWhereInputSchema';
import { UserMcpServerInstanceUpdateManyMutationInputSchema } from './UserMcpServerInstanceUpdateManyMutationInputSchema';
import { UserMcpServerInstanceUncheckedUpdateManyWithoutUserInputSchema } from './UserMcpServerInstanceUncheckedUpdateManyWithoutUserInputSchema';

export const UserMcpServerInstanceUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerInstanceUpdateManyMutationInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export default UserMcpServerInstanceUpdateManyWithWhereWithoutUserInputSchema;
