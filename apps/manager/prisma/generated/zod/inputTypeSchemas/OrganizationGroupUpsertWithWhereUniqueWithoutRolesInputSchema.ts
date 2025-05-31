import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupUpdateWithoutRolesInputSchema } from './OrganizationGroupUpdateWithoutRolesInputSchema';
import { OrganizationGroupUncheckedUpdateWithoutRolesInputSchema } from './OrganizationGroupUncheckedUpdateWithoutRolesInputSchema';
import { OrganizationGroupCreateWithoutRolesInputSchema } from './OrganizationGroupCreateWithoutRolesInputSchema';
import { OrganizationGroupUncheckedCreateWithoutRolesInputSchema } from './OrganizationGroupUncheckedCreateWithoutRolesInputSchema';

export const OrganizationGroupUpsertWithWhereUniqueWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationGroupUpsertWithWhereUniqueWithoutRolesInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationGroupUpdateWithoutRolesInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateWithoutRolesInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutRolesInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutRolesInputSchema) ]),
}).strict();

export default OrganizationGroupUpsertWithWhereUniqueWithoutRolesInputSchema;
