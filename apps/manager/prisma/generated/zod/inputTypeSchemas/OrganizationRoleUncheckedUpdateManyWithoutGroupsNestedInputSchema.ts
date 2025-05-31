import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleCreateWithoutGroupsInputSchema } from './OrganizationRoleCreateWithoutGroupsInputSchema';
import { OrganizationRoleUncheckedCreateWithoutGroupsInputSchema } from './OrganizationRoleUncheckedCreateWithoutGroupsInputSchema';
import { OrganizationRoleCreateOrConnectWithoutGroupsInputSchema } from './OrganizationRoleCreateOrConnectWithoutGroupsInputSchema';
import { OrganizationRoleUpsertWithWhereUniqueWithoutGroupsInputSchema } from './OrganizationRoleUpsertWithWhereUniqueWithoutGroupsInputSchema';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleUpdateWithWhereUniqueWithoutGroupsInputSchema } from './OrganizationRoleUpdateWithWhereUniqueWithoutGroupsInputSchema';
import { OrganizationRoleUpdateManyWithWhereWithoutGroupsInputSchema } from './OrganizationRoleUpdateManyWithWhereWithoutGroupsInputSchema';
import { OrganizationRoleScalarWhereInputSchema } from './OrganizationRoleScalarWhereInputSchema';

export const OrganizationRoleUncheckedUpdateManyWithoutGroupsNestedInputSchema: z.ZodType<Prisma.OrganizationRoleUncheckedUpdateManyWithoutGroupsNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleCreateWithoutGroupsInputSchema).array(),z.lazy(() => OrganizationRoleUncheckedCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutGroupsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationRoleCreateOrConnectWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleCreateOrConnectWithoutGroupsInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationRoleUpsertWithWhereUniqueWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleUpsertWithWhereUniqueWithoutGroupsInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationRoleUpdateWithWhereUniqueWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleUpdateWithWhereUniqueWithoutGroupsInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationRoleUpdateManyWithWhereWithoutGroupsInputSchema),z.lazy(() => OrganizationRoleUpdateManyWithWhereWithoutGroupsInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationRoleScalarWhereInputSchema),z.lazy(() => OrganizationRoleScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationRoleUncheckedUpdateManyWithoutGroupsNestedInputSchema;
