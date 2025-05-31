import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateWithoutGroupsInputSchema } from './OrganizationMemberCreateWithoutGroupsInputSchema';
import { OrganizationMemberUncheckedCreateWithoutGroupsInputSchema } from './OrganizationMemberUncheckedCreateWithoutGroupsInputSchema';
import { OrganizationMemberCreateOrConnectWithoutGroupsInputSchema } from './OrganizationMemberCreateOrConnectWithoutGroupsInputSchema';
import { OrganizationMemberUpsertWithWhereUniqueWithoutGroupsInputSchema } from './OrganizationMemberUpsertWithWhereUniqueWithoutGroupsInputSchema';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithWhereUniqueWithoutGroupsInputSchema } from './OrganizationMemberUpdateWithWhereUniqueWithoutGroupsInputSchema';
import { OrganizationMemberUpdateManyWithWhereWithoutGroupsInputSchema } from './OrganizationMemberUpdateManyWithWhereWithoutGroupsInputSchema';
import { OrganizationMemberScalarWhereInputSchema } from './OrganizationMemberScalarWhereInputSchema';

export const OrganizationMemberUncheckedUpdateManyWithoutGroupsNestedInputSchema: z.ZodType<Prisma.OrganizationMemberUncheckedUpdateManyWithoutGroupsNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberCreateWithoutGroupsInputSchema).array(),z.lazy(() => OrganizationMemberUncheckedCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutGroupsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationMemberCreateOrConnectWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberCreateOrConnectWithoutGroupsInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationMemberUpsertWithWhereUniqueWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberUpsertWithWhereUniqueWithoutGroupsInputSchema).array() ]).optional(),
  set: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationMemberUpdateWithWhereUniqueWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberUpdateWithWhereUniqueWithoutGroupsInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationMemberUpdateManyWithWhereWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberUpdateManyWithWhereWithoutGroupsInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationMemberScalarWhereInputSchema),z.lazy(() => OrganizationMemberScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationMemberUncheckedUpdateManyWithoutGroupsNestedInputSchema;
