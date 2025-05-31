import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberCreateWithoutRolesInputSchema } from './OrganizationMemberCreateWithoutRolesInputSchema';
import { OrganizationMemberUncheckedCreateWithoutRolesInputSchema } from './OrganizationMemberUncheckedCreateWithoutRolesInputSchema';

export const OrganizationMemberCreateOrConnectWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationMemberCreateOrConnectWithoutRolesInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutRolesInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutRolesInputSchema) ]),
}).strict();

export default OrganizationMemberCreateOrConnectWithoutRolesInputSchema;
