import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutCreatorInputSchema } from './OrganizationCreateWithoutCreatorInputSchema';
import { OrganizationUncheckedCreateWithoutCreatorInputSchema } from './OrganizationUncheckedCreateWithoutCreatorInputSchema';
import { OrganizationCreateOrConnectWithoutCreatorInputSchema } from './OrganizationCreateOrConnectWithoutCreatorInputSchema';
import { OrganizationCreateManyCreatorInputEnvelopeSchema } from './OrganizationCreateManyCreatorInputEnvelopeSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';

export const OrganizationUncheckedCreateNestedManyWithoutCreatorInputSchema: z.ZodType<Prisma.OrganizationUncheckedCreateNestedManyWithoutCreatorInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutCreatorInputSchema),z.lazy(() => OrganizationCreateWithoutCreatorInputSchema).array(),z.lazy(() => OrganizationUncheckedCreateWithoutCreatorInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutCreatorInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationCreateOrConnectWithoutCreatorInputSchema),z.lazy(() => OrganizationCreateOrConnectWithoutCreatorInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationCreateManyCreatorInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrganizationWhereUniqueInputSchema),z.lazy(() => OrganizationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationUncheckedCreateNestedManyWithoutCreatorInputSchema;
