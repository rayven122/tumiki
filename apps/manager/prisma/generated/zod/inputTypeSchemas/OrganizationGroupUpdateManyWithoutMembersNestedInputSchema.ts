import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupCreateWithoutMembersInputSchema } from './OrganizationGroupCreateWithoutMembersInputSchema';
import { OrganizationGroupUncheckedCreateWithoutMembersInputSchema } from './OrganizationGroupUncheckedCreateWithoutMembersInputSchema';
import { OrganizationGroupCreateOrConnectWithoutMembersInputSchema } from './OrganizationGroupCreateOrConnectWithoutMembersInputSchema';
import { OrganizationGroupUpsertWithWhereUniqueWithoutMembersInputSchema } from './OrganizationGroupUpsertWithWhereUniqueWithoutMembersInputSchema';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupUpdateWithWhereUniqueWithoutMembersInputSchema } from './OrganizationGroupUpdateWithWhereUniqueWithoutMembersInputSchema';
import { OrganizationGroupUpdateManyWithWhereWithoutMembersInputSchema } from './OrganizationGroupUpdateManyWithWhereWithoutMembersInputSchema';
import { OrganizationGroupScalarWhereInputSchema } from './OrganizationGroupScalarWhereInputSchema';

export const OrganizationGroupUpdateManyWithoutMembersNestedInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateManyWithoutMembersNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutMembersInputSchema),z.lazy(() => OrganizationGroupCreateWithoutMembersInputSchema).array(),z.lazy(() => OrganizationGroupUncheckedCreateWithoutMembersInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutMembersInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationGroupCreateOrConnectWithoutMembersInputSchema),z.lazy(() => OrganizationGroupCreateOrConnectWithoutMembersInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationGroupUpsertWithWhereUniqueWithoutMembersInputSchema),z.lazy(() => OrganizationGroupUpsertWithWhereUniqueWithoutMembersInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationGroupUpdateWithWhereUniqueWithoutMembersInputSchema),z.lazy(() => OrganizationGroupUpdateWithWhereUniqueWithoutMembersInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationGroupUpdateManyWithWhereWithoutMembersInputSchema),z.lazy(() => OrganizationGroupUpdateManyWithWhereWithoutMembersInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationGroupScalarWhereInputSchema),z.lazy(() => OrganizationGroupScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationGroupUpdateManyWithoutMembersNestedInputSchema;
