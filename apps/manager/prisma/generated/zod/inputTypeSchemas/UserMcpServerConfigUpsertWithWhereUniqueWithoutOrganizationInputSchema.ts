import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithoutOrganizationInputSchema } from './UserMcpServerConfigUpdateWithoutOrganizationInputSchema';
import { UserMcpServerConfigUncheckedUpdateWithoutOrganizationInputSchema } from './UserMcpServerConfigUncheckedUpdateWithoutOrganizationInputSchema';
import { UserMcpServerConfigCreateWithoutOrganizationInputSchema } from './UserMcpServerConfigCreateWithoutOrganizationInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema';

export const UserMcpServerConfigUpsertWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerConfigUpsertWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigUncheckedUpdateWithoutOrganizationInputSchema) ]),
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default UserMcpServerConfigUpsertWithWhereUniqueWithoutOrganizationInputSchema;
