import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigCreateWithoutOrganizationInputSchema } from './UserMcpServerConfigCreateWithoutOrganizationInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema';

export const UserMcpServerConfigCreateOrConnectWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateOrConnectWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default UserMcpServerConfigCreateOrConnectWithoutOrganizationInputSchema;
