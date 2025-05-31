import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupCreateWithoutRolesInputSchema } from './OrganizationGroupCreateWithoutRolesInputSchema';
import { OrganizationGroupUncheckedCreateWithoutRolesInputSchema } from './OrganizationGroupUncheckedCreateWithoutRolesInputSchema';
import { OrganizationGroupCreateOrConnectWithoutRolesInputSchema } from './OrganizationGroupCreateOrConnectWithoutRolesInputSchema';
import { OrganizationGroupUpsertWithWhereUniqueWithoutRolesInputSchema } from './OrganizationGroupUpsertWithWhereUniqueWithoutRolesInputSchema';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupUpdateWithWhereUniqueWithoutRolesInputSchema } from './OrganizationGroupUpdateWithWhereUniqueWithoutRolesInputSchema';
import { OrganizationGroupUpdateManyWithWhereWithoutRolesInputSchema } from './OrganizationGroupUpdateManyWithWhereWithoutRolesInputSchema';
import { OrganizationGroupScalarWhereInputSchema } from './OrganizationGroupScalarWhereInputSchema';

export const OrganizationGroupUncheckedUpdateManyWithoutRolesNestedInputSchema: z.ZodType<Prisma.OrganizationGroupUncheckedUpdateManyWithoutRolesNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutRolesInputSchema),z.lazy(() => OrganizationGroupCreateWithoutRolesInputSchema).array(),z.lazy(() => OrganizationGroupUncheckedCreateWithoutRolesInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutRolesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationGroupCreateOrConnectWithoutRolesInputSchema),z.lazy(() => OrganizationGroupCreateOrConnectWithoutRolesInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationGroupUpsertWithWhereUniqueWithoutRolesInputSchema),z.lazy(() => OrganizationGroupUpsertWithWhereUniqueWithoutRolesInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationGroupUpdateWithWhereUniqueWithoutRolesInputSchema),z.lazy(() => OrganizationGroupUpdateWithWhereUniqueWithoutRolesInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationGroupUpdateManyWithWhereWithoutRolesInputSchema),z.lazy(() => OrganizationGroupUpdateManyWithWhereWithoutRolesInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationGroupScalarWhereInputSchema),z.lazy(() => OrganizationGroupScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationGroupUncheckedUpdateManyWithoutRolesNestedInputSchema;
