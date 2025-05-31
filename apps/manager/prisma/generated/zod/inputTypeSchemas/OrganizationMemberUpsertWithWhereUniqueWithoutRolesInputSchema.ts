import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithoutRolesInputSchema } from './OrganizationMemberUpdateWithoutRolesInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutRolesInputSchema } from './OrganizationMemberUncheckedUpdateWithoutRolesInputSchema';
import { OrganizationMemberCreateWithoutRolesInputSchema } from './OrganizationMemberCreateWithoutRolesInputSchema';
import { OrganizationMemberUncheckedCreateWithoutRolesInputSchema } from './OrganizationMemberUncheckedCreateWithoutRolesInputSchema';

export const OrganizationMemberUpsertWithWhereUniqueWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationMemberUpsertWithWhereUniqueWithoutRolesInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationMemberUpdateWithoutRolesInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutRolesInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutRolesInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutRolesInputSchema) ]),
}).strict();

export default OrganizationMemberUpsertWithWhereUniqueWithoutRolesInputSchema;
