import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupUpdateWithoutOrganizationInputSchema } from './UserToolGroupUpdateWithoutOrganizationInputSchema';
import { UserToolGroupUncheckedUpdateWithoutOrganizationInputSchema } from './UserToolGroupUncheckedUpdateWithoutOrganizationInputSchema';

export const UserToolGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.UserToolGroupUpdateWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserToolGroupUpdateWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutOrganizationInputSchema) ]),
}).strict();

export default UserToolGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema;
