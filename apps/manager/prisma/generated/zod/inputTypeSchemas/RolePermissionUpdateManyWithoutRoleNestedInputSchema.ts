import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RolePermissionCreateWithoutRoleInputSchema } from './RolePermissionCreateWithoutRoleInputSchema';
import { RolePermissionUncheckedCreateWithoutRoleInputSchema } from './RolePermissionUncheckedCreateWithoutRoleInputSchema';
import { RolePermissionCreateOrConnectWithoutRoleInputSchema } from './RolePermissionCreateOrConnectWithoutRoleInputSchema';
import { RolePermissionUpsertWithWhereUniqueWithoutRoleInputSchema } from './RolePermissionUpsertWithWhereUniqueWithoutRoleInputSchema';
import { RolePermissionCreateManyRoleInputEnvelopeSchema } from './RolePermissionCreateManyRoleInputEnvelopeSchema';
import { RolePermissionWhereUniqueInputSchema } from './RolePermissionWhereUniqueInputSchema';
import { RolePermissionUpdateWithWhereUniqueWithoutRoleInputSchema } from './RolePermissionUpdateWithWhereUniqueWithoutRoleInputSchema';
import { RolePermissionUpdateManyWithWhereWithoutRoleInputSchema } from './RolePermissionUpdateManyWithWhereWithoutRoleInputSchema';
import { RolePermissionScalarWhereInputSchema } from './RolePermissionScalarWhereInputSchema';

export const RolePermissionUpdateManyWithoutRoleNestedInputSchema: z.ZodType<Prisma.RolePermissionUpdateManyWithoutRoleNestedInput> = z.object({
  create: z.union([ z.lazy(() => RolePermissionCreateWithoutRoleInputSchema),z.lazy(() => RolePermissionCreateWithoutRoleInputSchema).array(),z.lazy(() => RolePermissionUncheckedCreateWithoutRoleInputSchema),z.lazy(() => RolePermissionUncheckedCreateWithoutRoleInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => RolePermissionCreateOrConnectWithoutRoleInputSchema),z.lazy(() => RolePermissionCreateOrConnectWithoutRoleInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => RolePermissionUpsertWithWhereUniqueWithoutRoleInputSchema),z.lazy(() => RolePermissionUpsertWithWhereUniqueWithoutRoleInputSchema).array() ]).optional(),
  createMany: z.lazy(() => RolePermissionCreateManyRoleInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => RolePermissionWhereUniqueInputSchema),z.lazy(() => RolePermissionWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => RolePermissionWhereUniqueInputSchema),z.lazy(() => RolePermissionWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => RolePermissionWhereUniqueInputSchema),z.lazy(() => RolePermissionWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => RolePermissionWhereUniqueInputSchema),z.lazy(() => RolePermissionWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => RolePermissionUpdateWithWhereUniqueWithoutRoleInputSchema),z.lazy(() => RolePermissionUpdateWithWhereUniqueWithoutRoleInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => RolePermissionUpdateManyWithWhereWithoutRoleInputSchema),z.lazy(() => RolePermissionUpdateManyWithWhereWithoutRoleInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => RolePermissionScalarWhereInputSchema),z.lazy(() => RolePermissionScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default RolePermissionUpdateManyWithoutRoleNestedInputSchema;
