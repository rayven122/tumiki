import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupScalarWhereInputSchema } from './UserToolGroupScalarWhereInputSchema';
import { UserToolGroupUpdateManyMutationInputSchema } from './UserToolGroupUpdateManyMutationInputSchema';
import { UserToolGroupUncheckedUpdateManyWithoutOrganizationInputSchema } from './UserToolGroupUncheckedUpdateManyWithoutOrganizationInputSchema';

export const UserToolGroupUpdateManyWithWhereWithoutOrganizationInputSchema: z.ZodType<Prisma.UserToolGroupUpdateManyWithWhereWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserToolGroupScalarWhereInputSchema),
  data: z.union([ z.lazy(() => UserToolGroupUpdateManyMutationInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateManyWithoutOrganizationInputSchema) ]),
}).strict();

export default UserToolGroupUpdateManyWithWhereWithoutOrganizationInputSchema;
