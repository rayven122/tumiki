import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleUpdateWithoutOrganizationInputSchema } from './OrganizationRoleUpdateWithoutOrganizationInputSchema';
import { OrganizationRoleUncheckedUpdateWithoutOrganizationInputSchema } from './OrganizationRoleUncheckedUpdateWithoutOrganizationInputSchema';
import { OrganizationRoleCreateWithoutOrganizationInputSchema } from './OrganizationRoleCreateWithoutOrganizationInputSchema';
import { OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema';

export const OrganizationRoleUpsertWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationRoleUpsertWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationRoleUpdateWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateWithoutOrganizationInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationRoleUpsertWithWhereUniqueWithoutOrganizationInputSchema;
