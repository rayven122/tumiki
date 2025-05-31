import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupScalarWhereInputSchema } from './UserMcpServerInstanceToolGroupScalarWhereInputSchema';
import { UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema } from './UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupInputSchema';

export const UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutToolGroupInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedUpdateManyWithoutToolGroupInputSchema) ]),
}).strict();

export default UserMcpServerInstanceToolGroupUpdateManyWithWhereWithoutToolGroupInputSchema;
