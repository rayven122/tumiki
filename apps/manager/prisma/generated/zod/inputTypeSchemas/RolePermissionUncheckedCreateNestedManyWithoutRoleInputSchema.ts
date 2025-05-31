import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RolePermissionCreateWithoutRoleInputSchema } from './RolePermissionCreateWithoutRoleInputSchema';
import { RolePermissionUncheckedCreateWithoutRoleInputSchema } from './RolePermissionUncheckedCreateWithoutRoleInputSchema';
import { RolePermissionCreateOrConnectWithoutRoleInputSchema } from './RolePermissionCreateOrConnectWithoutRoleInputSchema';
import { RolePermissionCreateManyRoleInputEnvelopeSchema } from './RolePermissionCreateManyRoleInputEnvelopeSchema';
import { RolePermissionWhereUniqueInputSchema } from './RolePermissionWhereUniqueInputSchema';

export const RolePermissionUncheckedCreateNestedManyWithoutRoleInputSchema: z.ZodType<Prisma.RolePermissionUncheckedCreateNestedManyWithoutRoleInput> = z.object({
  create: z.union([ z.lazy(() => RolePermissionCreateWithoutRoleInputSchema),z.lazy(() => RolePermissionCreateWithoutRoleInputSchema).array(),z.lazy(() => RolePermissionUncheckedCreateWithoutRoleInputSchema),z.lazy(() => RolePermissionUncheckedCreateWithoutRoleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => RolePermissionCreateOrConnectWithoutRoleInputSchema),z.lazy(() => RolePermissionCreateOrConnectWithoutRoleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => RolePermissionCreateManyRoleInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => RolePermissionWhereUniqueInputSchema),z.lazy(() => RolePermissionWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default RolePermissionUncheckedCreateNestedManyWithoutRoleInputSchema;
