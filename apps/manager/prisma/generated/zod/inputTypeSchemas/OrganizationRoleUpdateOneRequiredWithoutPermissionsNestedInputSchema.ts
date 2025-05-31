import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleCreateWithoutPermissionsInputSchema } from './OrganizationRoleCreateWithoutPermissionsInputSchema';
import { OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema } from './OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema';
import { OrganizationRoleCreateOrConnectWithoutPermissionsInputSchema } from './OrganizationRoleCreateOrConnectWithoutPermissionsInputSchema';
import { OrganizationRoleUpsertWithoutPermissionsInputSchema } from './OrganizationRoleUpsertWithoutPermissionsInputSchema';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleUpdateToOneWithWhereWithoutPermissionsInputSchema } from './OrganizationRoleUpdateToOneWithWhereWithoutPermissionsInputSchema';
import { OrganizationRoleUpdateWithoutPermissionsInputSchema } from './OrganizationRoleUpdateWithoutPermissionsInputSchema';
import { OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema } from './OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema';

export const OrganizationRoleUpdateOneRequiredWithoutPermissionsNestedInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateOneRequiredWithoutPermissionsNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutPermissionsInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutPermissionsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationRoleCreateOrConnectWithoutPermissionsInputSchema).optional(),
  upsert: z.lazy(() => OrganizationRoleUpsertWithoutPermissionsInputSchema).optional(),
  connect: z.lazy(() => OrganizationRoleWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrganizationRoleUpdateToOneWithWhereWithoutPermissionsInputSchema),z.lazy(() => OrganizationRoleUpdateWithoutPermissionsInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateWithoutPermissionsInputSchema) ]).optional(),
}).strict();

export default OrganizationRoleUpdateOneRequiredWithoutPermissionsNestedInputSchema;
