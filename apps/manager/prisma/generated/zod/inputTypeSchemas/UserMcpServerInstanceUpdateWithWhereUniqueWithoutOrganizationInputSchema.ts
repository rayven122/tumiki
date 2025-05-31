import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceUpdateWithoutOrganizationInputSchema } from './UserMcpServerInstanceUpdateWithoutOrganizationInputSchema';
import { UserMcpServerInstanceUncheckedUpdateWithoutOrganizationInputSchema } from './UserMcpServerInstanceUncheckedUpdateWithoutOrganizationInputSchema';

export const UserMcpServerInstanceUpdateWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpdateWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => UserMcpServerInstanceUpdateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateWithoutOrganizationInputSchema) ]),
}).strict();

export default UserMcpServerInstanceUpdateWithWhereUniqueWithoutOrganizationInputSchema;
