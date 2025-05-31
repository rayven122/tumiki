import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupUpdateWithoutOrganizationInputSchema } from './UserToolGroupUpdateWithoutOrganizationInputSchema';
import { UserToolGroupUncheckedUpdateWithoutOrganizationInputSchema } from './UserToolGroupUncheckedUpdateWithoutOrganizationInputSchema';
import { UserToolGroupCreateWithoutOrganizationInputSchema } from './UserToolGroupCreateWithoutOrganizationInputSchema';
import { UserToolGroupUncheckedCreateWithoutOrganizationInputSchema } from './UserToolGroupUncheckedCreateWithoutOrganizationInputSchema';

export const UserToolGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.UserToolGroupUpsertWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserToolGroupUpdateWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutOrganizationInputSchema) ]),
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default UserToolGroupUpsertWithWhereUniqueWithoutOrganizationInputSchema;
