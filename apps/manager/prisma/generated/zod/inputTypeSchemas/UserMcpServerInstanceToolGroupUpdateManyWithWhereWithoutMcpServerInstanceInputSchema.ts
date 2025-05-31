import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupScalarWhereInputSchema } from './UserMcpServerInstanceToolGroupScalarWhereInputSchema';
import { UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema } from './UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutMcpServerInstanceInputSchema';

export const UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutMcpServerInstanceInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutMcpServerInstanceInputSchema) ]),
}).strict();

export default UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutMcpServerInstanceInputSchema;
