import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RolePermissionWhereUniqueInputSchema } from './RolePermissionWhereUniqueInputSchema';
import { RolePermissionCreateWithoutRoleInputSchema } from './RolePermissionCreateWithoutRoleInputSchema';
import { RolePermissionUncheckedCreateWithoutRoleInputSchema } from './RolePermissionUncheckedCreateWithoutRoleInputSchema';

export const RolePermissionCreateOrConnectWithoutRoleInputSchema: z.ZodType<Prisma.RolePermissionCreateOrConnectWithoutRoleInput> = z.object({
  where: z.lazy(() => RolePermissionWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => RolePermissionCreateWithoutRoleInputSchema),z.lazy(() => RolePermissionUncheckedCreateWithoutRoleInputSchema) ]),
}).strict();

export default RolePermissionCreateOrConnectWithoutRoleInputSchema;
