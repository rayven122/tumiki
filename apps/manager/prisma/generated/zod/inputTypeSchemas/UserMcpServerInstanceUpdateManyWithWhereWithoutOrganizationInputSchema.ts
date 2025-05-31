import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceScalarWhereInputSchema } from './UserMcpServerInstanceScalarWhereInputSchema';
import { UserMcpServerInstanceUpdateManyMutationInputSchema } from './UserMcpServerInstanceUpdateManyMutationInputSchema';
import { UserMcpServerInstanceUncheckedUpdateManyWithoutOrganizationInputSchema } from './UserMcpServerInstanceUncheckedUpdateManyWithoutOrganizationInputSchema';

export const UserMcpServerInstanceUpdateManyWithWhereWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpdateManyWithWhereWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerInstanceUpdateManyMutationInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateManyWithoutOrganizationInputSchema) ]),
}).strict();

export default UserMcpServerInstanceUpdateManyWithWhereWithoutOrganizationInputSchema;
