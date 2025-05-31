import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupCreateWithoutOrganizationInputSchema } from './UserToolGroupCreateWithoutOrganizationInputSchema';
import { UserToolGroupUncheckedCreateWithoutOrganizationInputSchema } from './UserToolGroupUncheckedCreateWithoutOrganizationInputSchema';

export const UserToolGroupCreateOrConnectWithoutOrganizationInputSchema: z.ZodType<Prisma.UserToolGroupCreateOrConnectWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default UserToolGroupCreateOrConnectWithoutOrganizationInputSchema;
