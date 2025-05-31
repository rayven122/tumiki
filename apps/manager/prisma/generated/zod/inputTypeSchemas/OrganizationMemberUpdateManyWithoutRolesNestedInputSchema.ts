import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateWithoutRolesInputSchema } from './OrganizationMemberCreateWithoutRolesInputSchema';
import { OrganizationMemberUncheckedCreateWithoutRolesInputSchema } from './OrganizationMemberUncheckedCreateWithoutRolesInputSchema';
import { OrganizationMemberCreateOrConnectWithoutRolesInputSchema } from './OrganizationMemberCreateOrConnectWithoutRolesInputSchema';
import { OrganizationMemberUpsertWithWhereUniqueWithoutRolesInputSchema } from './OrganizationMemberUpsertWithWhereUniqueWithoutRolesInputSchema';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithWhereUniqueWithoutRolesInputSchema } from './OrganizationMemberUpdateWithWhereUniqueWithoutRolesInputSchema';
import { OrganizationMemberUpdateManyWithWhereWithoutRolesInputSchema } from './OrganizationMemberUpdateManyWithWhereWithoutRolesInputSchema';
import { OrganizationMemberScalarWhereInputSchema } from './OrganizationMemberScalarWhereInputSchema';

export const OrganizationMemberUpdateManyWithoutRolesNestedInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateManyWithoutRolesNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutRolesInputSchema),z.lazy(() => OrganizationMemberCreateWithoutRolesInputSchema).array(),z.lazy(() => OrganizationMemberUncheckedCreateWithoutRolesInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutRolesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationMemberCreateOrConnectWithoutRolesInputSchema),z.lazy(() => OrganizationMemberCreateOrConnectWithoutRolesInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationMemberUpsertWithWhereUniqueWithoutRolesInputSchema),z.lazy(() => OrganizationMemberUpsertWithWhereUniqueWithoutRolesInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationMemberUpdateWithWhereUniqueWithoutRolesInputSchema),z.lazy(() => OrganizationMemberUpdateWithWhereUniqueWithoutRolesInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationMemberUpdateManyWithWhereWithoutRolesInputSchema),z.lazy(() => OrganizationMemberUpdateManyWithWhereWithoutRolesInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationMemberScalarWhereInputSchema),z.lazy(() => OrganizationMemberScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationMemberUpdateManyWithoutRolesNestedInputSchema;
