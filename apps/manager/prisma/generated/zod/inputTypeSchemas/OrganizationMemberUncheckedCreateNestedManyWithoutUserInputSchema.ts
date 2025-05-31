import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateWithoutUserInputSchema } from './OrganizationMemberCreateWithoutUserInputSchema';
import { OrganizationMemberUncheckedCreateWithoutUserInputSchema } from './OrganizationMemberUncheckedCreateWithoutUserInputSchema';
import { OrganizationMemberCreateOrConnectWithoutUserInputSchema } from './OrganizationMemberCreateOrConnectWithoutUserInputSchema';
import { OrganizationMemberCreateManyUserInputEnvelopeSchema } from './OrganizationMemberCreateManyUserInputEnvelopeSchema';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';

export const OrganizationMemberUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.OrganizationMemberUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutUserInputSchema),z.lazy(() => OrganizationMemberCreateWithoutUserInputSchema).array(),z.lazy(() => OrganizationMemberUncheckedCreateWithoutUserInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationMemberCreateOrConnectWithoutUserInputSchema),z.lazy(() => OrganizationMemberCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationMemberCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrganizationMemberWhereUniqueInputSchema),z.lazy(() => OrganizationMemberWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationMemberUncheckedCreateNestedManyWithoutUserInputSchema;
