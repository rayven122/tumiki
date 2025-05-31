import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithoutOrganizationInputSchema } from './UserMcpServerConfigUpdateWithoutOrganizationInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutOrganizationInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutOrganizationInputSchema';

export const UserMcpServerConfigUpdateWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutOrganizationInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpdateWithWhereUniqueWithoutOrganizationInputSchema;
