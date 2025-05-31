import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereInputSchema } from './OrganizationRoleWhereInputSchema';
import { OrganizationRoleUpdateWithoutPermissionsInputSchema } from './OrganizationRoleUpdateWithoutPermissionsInputSchema';
import { OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema } from './OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema';

export const OrganizationRoleUpdateToOneWithWhereWithoutPermissionsInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateToOneWithWhereWithoutPermissionsInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrganizationRoleUpdateWithoutPermissionsInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema) ]),
}).strict();

export default OrganizationRoleUpdateToOneWithWhereWithoutPermissionsInputSchema;
