import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RolePermissionWhereUniqueInputSchema } from './RolePermissionWhereUniqueInputSchema';
import { RolePermissionUpdateWithoutRoleInputSchema } from './RolePermissionUpdateWithoutRoleInputSchema';
import { RolePermissionUncheckedUpdateWithoutRoleInputSchema } from './RolePermissionUncheckedUpdateWithoutRoleInputSchema';
import { RolePermissionCreateWithoutRoleInputSchema } from './RolePermissionCreateWithoutRoleInputSchema';
import { RolePermissionUncheckedCreateWithoutRoleInputSchema } from './RolePermissionUncheckedCreateWithoutRoleInputSchema';

export const RolePermissionUpsertWithWhereUniqueWithoutRoleInputSchema: z.ZodType<Prisma.RolePermissionUpsertWithWhereUniqueWithoutRoleInput> = z.object({
  where: z.lazy(() => RolePermissionWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => RolePermissionUpdateWithoutRoleInputSchema),z.lazy(() => RolePermissionUncheckedUpdateWithoutRoleInputSchema) ]),
  create: z.union([ z.lazy(() => RolePermissionCreateWithoutRoleInputSchema),z.lazy(() => RolePermissionUncheckedCreateWithoutRoleInputSchema) ]),
}).strict();

export default RolePermissionUpsertWithWhereUniqueWithoutRoleInputSchema;
