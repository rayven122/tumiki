import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleCreateWithoutMembersInputSchema } from './OrganizationRoleCreateWithoutMembersInputSchema';
import { OrganizationRoleUncheckedCreateWithoutMembersInputSchema } from './OrganizationRoleUncheckedCreateWithoutMembersInputSchema';
import { OrganizationRoleCreateOrConnectWithoutMembersInputSchema } from './OrganizationRoleCreateOrConnectWithoutMembersInputSchema';
import { OrganizationRoleUpsertWithWhereUniqueWithoutMembersInputSchema } from './OrganizationRoleUpsertWithWhereUniqueWithoutMembersInputSchema';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleUpdateWithWhereUniqueWithoutMembersInputSchema } from './OrganizationRoleUpdateWithWhereUniqueWithoutMembersInputSchema';
import { OrganizationRoleUpdateManyWithWhereWithoutMembersInputSchema } from './OrganizationRoleUpdateManyWithWhereWithoutMembersInputSchema';
import { OrganizationRoleScalarWhereInputSchema } from './OrganizationRoleScalarWhereInputSchema';

export const OrganizationRoleUpdateManyWithoutMembersNestedInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateManyWithoutMembersNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutMembersInputSchema),z.lazy(() => OrganizationRoleCreateWithoutMembersInputSchema).array(),z.lazy(() => OrganizationRoleUncheckedCreateWithoutMembersInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutMembersInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationRoleCreateOrConnectWithoutMembersInputSchema),z.lazy(() => OrganizationRoleCreateOrConnectWithoutMembersInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationRoleUpsertWithWhereUniqueWithoutMembersInputSchema),z.lazy(() => OrganizationRoleUpsertWithWhereUniqueWithoutMembersInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationRoleUpdateWithWhereUniqueWithoutMembersInputSchema),z.lazy(() => OrganizationRoleUpdateWithWhereUniqueWithoutMembersInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationRoleUpdateManyWithWhereWithoutMembersInputSchema),z.lazy(() => OrganizationRoleUpdateManyWithWhereWithoutMembersInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationRoleScalarWhereInputSchema),z.lazy(() => OrganizationRoleScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationRoleUpdateManyWithoutMembersNestedInputSchema;
