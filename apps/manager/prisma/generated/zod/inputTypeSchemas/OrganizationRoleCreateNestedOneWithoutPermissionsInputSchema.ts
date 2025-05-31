import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleCreateWithoutPermissionsInputSchema } from './OrganizationRoleCreateWithoutPermissionsInputSchema';
import { OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema } from './OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema';
import { OrganizationRoleCreateOrConnectWithoutPermissionsInputSchema } from './OrganizationRoleCreateOrConnectWithoutPermissionsInputSchema';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';

export const OrganizationRoleCreateNestedOneWithoutPermissionsInputSchema: z.ZodType<Prisma.OrganizationRoleCreateNestedOneWithoutPermissionsInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutPermissionsInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationRoleCreateOrConnectWithoutPermissionsInputSchema).optional(),
  connect: z.lazy(() => OrganizationRoleWhereUniqueInputSchema).optional()
}).strict();

export default OrganizationRoleCreateNestedOneWithoutPermissionsInputSchema;
