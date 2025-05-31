import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleCreateWithoutPermissionsInputSchema } from './OrganizationRoleCreateWithoutPermissionsInputSchema';
import { OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema } from './OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema';

export const OrganizationRoleCreateOrConnectWithoutPermissionsInputSchema: z.ZodType<Prisma.OrganizationRoleCreateOrConnectWithoutPermissionsInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutPermissionsInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema) ]),
}).strict();

export default OrganizationRoleCreateOrConnectWithoutPermissionsInputSchema;
