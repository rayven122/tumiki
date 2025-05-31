import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleCreateWithoutOrganizationInputSchema } from './OrganizationRoleCreateWithoutOrganizationInputSchema';
import { OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema';
import { OrganizationRoleCreateOrConnectWithoutOrganizationInputSchema } from './OrganizationRoleCreateOrConnectWithoutOrganizationInputSchema';
import { OrganizationRoleCreateManyOrganizationInputEnvelopeSchema } from './OrganizationRoleCreateManyOrganizationInputEnvelopeSchema';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';

export const OrganizationRoleUncheckedCreateNestedManyWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationRoleUncheckedCreateNestedManyWithoutOrganizationInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleCreateWithoutOrganizationInputSchema).array(),z.lazy(() => OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationRoleCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationRoleCreateManyOrganizationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrganizationRoleWhereUniqueInputSchema),z.lazy(() => OrganizationRoleWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationRoleUncheckedCreateNestedManyWithoutOrganizationInputSchema;
