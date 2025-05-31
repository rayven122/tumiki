import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RolePermissionScalarWhereInputSchema } from './RolePermissionScalarWhereInputSchema';
import { RolePermissionUpdateManyMutationInputSchema } from './RolePermissionUpdateManyMutationInputSchema';
import { RolePermissionUncheckedUpdateManyWithoutRoleInputSchema } from './RolePermissionUncheckedUpdateManyWithoutRoleInputSchema';

export const RolePermissionUpdateManyWithWhereWithoutRoleInputSchema: z.ZodType<Prisma.RolePermissionUpdateManyWithWhereWithoutRoleInput> = z.object({
  where: z.lazy(() => RolePermissionScalarWhereInputSchema),
  data: z.union([ z.lazy(() => RolePermissionUpdateManyMutationInputSchema),z.lazy(() => RolePermissionUncheckedUpdateManyWithoutRoleInputSchema) ]),
}).strict();

export default RolePermissionUpdateManyWithWhereWithoutRoleInputSchema;
