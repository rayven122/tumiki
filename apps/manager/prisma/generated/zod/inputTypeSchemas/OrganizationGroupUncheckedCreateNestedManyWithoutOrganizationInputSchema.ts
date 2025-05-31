import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupCreateWithoutOrganizationInputSchema } from './OrganizationGroupCreateWithoutOrganizationInputSchema';
import { OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema';
import { OrganizationGroupCreateOrConnectWithoutOrganizationInputSchema } from './OrganizationGroupCreateOrConnectWithoutOrganizationInputSchema';
import { OrganizationGroupCreateManyOrganizationInputEnvelopeSchema } from './OrganizationGroupCreateManyOrganizationInputEnvelopeSchema';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';

export const OrganizationGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationGroupUncheckedCreateNestedManyWithoutOrganizationInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupCreateWithoutOrganizationInputSchema).array(),z.lazy(() => OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationGroupCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationGroupCreateManyOrganizationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrganizationGroupWhereUniqueInputSchema),z.lazy(() => OrganizationGroupWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema;
