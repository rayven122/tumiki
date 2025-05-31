import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateWithoutGroupsInputSchema } from './OrganizationMemberCreateWithoutGroupsInputSchema';
import { OrganizationMemberUncheckedCreateWithoutGroupsInputSchema } from './OrganizationMemberUncheckedCreateWithoutGroupsInputSchema';
import { OrganizationMemberCreateOrConnectWithoutGroupsInputSchema } from './OrganizationMemberCreateOrConnectWithoutGroupsInputSchema';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';

export const OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberCreateWithoutGroupsInputSchema).array(),z.lazy(() => OrganizationMemberUncheckedCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutGroupsInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationMemberCreateOrConnectWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberCreateOrConnectWithoutGroupsInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationMemberUncheckedCreateNestedManyWithoutGroupsInputSchema;
