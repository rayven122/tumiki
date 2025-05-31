import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceUpdateWithoutOrganizationInputSchema } from './UserMcpServerInstanceUpdateWithoutOrganizationInputSchema';
import { UserMcpServerInstanceUncheckedUpdateWithoutOrganizationInputSchema } from './UserMcpServerInstanceUncheckedUpdateWithoutOrganizationInputSchema';
import { UserMcpServerInstanceCreateWithoutOrganizationInputSchema } from './UserMcpServerInstanceCreateWithoutOrganizationInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema';

export const UserMcpServerInstanceUpsertWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpsertWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserMcpServerInstanceUpdateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateWithoutOrganizationInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default UserMcpServerInstanceUpsertWithWhereUniqueWithoutOrganizationInputSchema;
