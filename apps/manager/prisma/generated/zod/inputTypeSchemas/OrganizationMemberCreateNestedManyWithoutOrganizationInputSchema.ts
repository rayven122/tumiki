import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateWithoutOrganizationInputSchema } from './OrganizationMemberCreateWithoutOrganizationInputSchema';
import { OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema';
import { OrganizationMemberCreateOrConnectWithoutOrganizationInputSchema } from './OrganizationMemberCreateOrConnectWithoutOrganizationInputSchema';
import { OrganizationMemberCreateManyOrganizationInputEnvelopeSchema } from './OrganizationMemberCreateManyOrganizationInputEnvelopeSchema';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';

export const OrganizationMemberCreateNestedManyWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationMemberCreateNestedManyWithoutOrganizationInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberCreateWithoutOrganizationInputSchema).array(),z.lazy(() => OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationMemberCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationMemberCreateManyOrganizationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationMemberCreateNestedManyWithoutOrganizationInputSchema;
