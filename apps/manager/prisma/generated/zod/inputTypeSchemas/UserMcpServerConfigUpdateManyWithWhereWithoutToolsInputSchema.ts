import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigScalarWhereInputSchema } from './UserMcpServerConfigScalarWhereInputSchema';
import { UserMcpServerConfigUpdateManyMutationInputSchema } from './UserMcpServerConfigUpdateManyMutationInputSchema';
import { UserMcpServerConfigUncheckedUpdateManyWithoutToolsInputSchema } from './UserMcpServerConfigUncheckedUpdateManyWithoutToolsInputSchema';

export const UserMcpServerConfigUpdateManyWithWhereWithoutToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateManyWithWhereWithoutToolsInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerConfigUpdateManyMutationInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateManyWithoutToolsInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpdateManyWithWhereWithoutToolsInputSchema;
