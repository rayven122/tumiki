import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleUpdateWithoutPermissionsInputSchema } from './OrganizationRoleUpdateWithoutPermissionsInputSchema';
import { OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema } from './OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema';
import { OrganizationRoleCreateWithoutPermissionsInputSchema } from './OrganizationRoleCreateWithoutPermissionsInputSchema';
import { OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema } from './OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema';
import { OrganizationRoleWhereInputSchema } from './OrganizationRoleWhereInputSchema';

export const OrganizationRoleUpsertWithoutPermissionsInputSchema: z.ZodType<Prisma.OrganizationRoleUpsertWithoutPermissionsInput> = z.object({
  update: z.union([ z.lazy(() => OrganizationRoleUpdateWithoutPermissionsInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutPermissionsInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema) ]),
  where: z.lazy(() => OrganizationRoleWhereInputSchema).optional()
}).strict();

export default OrganizationRoleUpsertWithoutPermissionsInputSchema;
