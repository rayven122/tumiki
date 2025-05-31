import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationCreateWithoutInvitedByUserInputSchema } from './OrganizationInvitationCreateWithoutInvitedByUserInputSchema';
import { OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema } from './OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema';
import { OrganizationInvitationCreateOrConnectWithoutInvitedByUserInputSchema } from './OrganizationInvitationCreateOrConnectWithoutInvitedByUserInputSchema';
import { OrganizationInvitationUpsertWithWhereUniqueWithoutInvitedByUserInputSchema } from './OrganizationInvitationUpsertWithWhereUniqueWithoutInvitedByUserInputSchema';
import { OrganizationInvitationCreateManyInvitedByUserInputEnvelopeSchema } from './OrganizationInvitationCreateManyInvitedByUserInputEnvelopeSchema';
import { OrganizationInvitationWhereUniqueInputSchema } from './OrganizationInvitationWhereUniqueInputSchema';
import { OrganizationInvitationUpdateWithWhereUniqueWithoutInvitedByUserInputSchema } from './OrganizationInvitationUpdateWithWhereUniqueWithoutInvitedByUserInputSchema';
import { OrganizationInvitationUpdateManyWithWhereWithoutInvitedByUserInputSchema } from './OrganizationInvitationUpdateManyWithWhereWithoutInvitedByUserInputSchema';
import { OrganizationInvitationScalarWhereInputSchema } from './OrganizationInvitationScalarWhereInputSchema';

export const OrganizationInvitationUncheckedUpdateManyWithoutInvitedByUserNestedInputSchema: z.ZodType<Prisma.OrganizationInvitationUncheckedUpdateManyWithoutInvitedByUserNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationInvitationCreateWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationCreateWithoutInvitedByUserInputSchema).array(),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationInvitationCreateOrConnectWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationCreateOrConnectWithoutInvitedByUserInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationInvitationUpsertWithWhereUniqueWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationUpsertWithWhereUniqueWithoutInvitedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationInvitationCreateManyInvitedByUserInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),z.lazy(() => OrganizationInvitationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),z.lazy(() => OrganizationInvitationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),z.lazy(() => OrganizationInvitationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),z.lazy(() => OrganizationInvitationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationInvitationUpdateWithWhereUniqueWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationUpdateWithWhereUniqueWithoutInvitedByUserInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationInvitationUpdateManyWithWhereWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationUpdateManyWithWhereWithoutInvitedByUserInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationInvitationScalarWhereInputSchema),z.lazy(() => OrganizationInvitationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationInvitationUncheckedUpdateManyWithoutInvitedByUserNestedInputSchema;
