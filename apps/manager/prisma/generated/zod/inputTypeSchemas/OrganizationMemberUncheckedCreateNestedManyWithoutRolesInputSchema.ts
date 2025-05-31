import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateWithoutRolesInputSchema } from './OrganizationMemberCreateWithoutRolesInputSchema';
import { OrganizationMemberUncheckedCreateWithoutRolesInputSchema } from './OrganizationMemberUncheckedCreateWithoutRolesInputSchema';
import { OrganizationMemberCreateOrConnectWithoutRolesInputSchema } from './OrganizationMemberCreateOrConnectWithoutRolesInputSchema';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';

export const OrganizationMemberUncheckedCreateNestedManyWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationMemberUncheckedCreateNestedManyWithoutRolesInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutRolesInputSchema),z.lazy(() => OrganizationMemberCreateWithoutRolesInputSchema).array(),z.lazy(() => OrganizationMemberUncheckedCreateWithoutRolesInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutRolesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationMemberCreateOrConnectWithoutRolesInputSchema),z.lazy(() => OrganizationMemberCreateOrConnectWithoutRolesInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationMemberUncheckedCreateNestedManyWithoutRolesInputSchema;
