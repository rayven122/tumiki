import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceCreateWithoutOrganizationInputSchema } from './UserMcpServerInstanceCreateWithoutOrganizationInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema';

export const UserMcpServerInstanceCreateOrConnectWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateOrConnectWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default UserMcpServerInstanceCreateOrConnectWithoutOrganizationInputSchema;
