import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupCreateWithoutRolesInputSchema } from './OrganizationGroupCreateWithoutRolesInputSchema';
import { OrganizationGroupUncheckedCreateWithoutRolesInputSchema } from './OrganizationGroupUncheckedCreateWithoutRolesInputSchema';
import { OrganizationGroupCreateOrConnectWithoutRolesInputSchema } from './OrganizationGroupCreateOrConnectWithoutRolesInputSchema';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';

export const OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationGroupUncheckedCreateNestedManyWithoutRolesInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutRolesInputSchema),z.lazy(() => OrganizationGroupCreateWithoutRolesInputSchema).array(),z.lazy(() => OrganizationGroupUncheckedCreateWithoutRolesInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutRolesInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationGroupCreateOrConnectWithoutRolesInputSchema),z.lazy(() => OrganizationGroupCreateOrConnectWithoutRolesInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationGroupUncheckedCreateNestedManyWithoutRolesInputSchema;
