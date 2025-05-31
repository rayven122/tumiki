import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigScalarWhereInputSchema } from './UserMcpServerConfigScalarWhereInputSchema';
import { UserMcpServerConfigUpdateManyMutationInputSchema } from './UserMcpServerConfigUpdateManyMutationInputSchema';
import { UserMcpServerConfigUncheckedUpdateManyWithoutOrganizationInputSchema } from './UserMcpServerConfigUncheckedUpdateManyWithoutOrganizationInputSchema';

export const UserMcpServerConfigUpdateManyWithWhereWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateManyWithWhereWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerConfigUpdateManyMutationInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateManyWithoutOrganizationInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpdateManyWithWhereWithoutOrganizationInputSchema;
