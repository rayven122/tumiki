import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationCreateWithoutOrganizationInputSchema } from './OrganizationInvitationCreateWithoutOrganizationInputSchema';
import { OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema';
import { OrganizationInvitationCreateOrConnectWithoutOrganizationInputSchema } from './OrganizationInvitationCreateOrConnectWithoutOrganizationInputSchema';
import { OrganizationInvitationUpsertWithWhereUniqueWithoutOrganizationInputSchema } from './OrganizationInvitationUpsertWithWhereUniqueWithoutOrganizationInputSchema';
import { OrganizationInvitationCreateManyOrganizationInputEnvelopeSchema } from './OrganizationInvitationCreateManyOrganizationInputEnvelopeSchema';
import { OrganizationInvitationWhereUniqueInputSchema } from './OrganizationInvitationWhereUniqueInputSchema';
import { OrganizationInvitationUpdateWithWhereUniqueWithoutOrganizationInputSchema } from './OrganizationInvitationUpdateWithWhereUniqueWithoutOrganizationInputSchema';
import { OrganizationInvitationUpdateManyWithWhereWithoutOrganizationInputSchema } from './OrganizationInvitationUpdateManyWithWhereWithoutOrganizationInputSchema';
import { OrganizationInvitationScalarWhereInputSchema } from './OrganizationInvitationScalarWhereInputSchema';

export const OrganizationInvitationUncheckedUpdateManyWithoutOrganizationNestedInputSchema: z.ZodType<Prisma.OrganizationInvitationUncheckedUpdateManyWithoutOrganizationNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationInvitationCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationCreateWithoutOrganizationInputSchema).array(),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationInvitationCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => OrganizationInvitationUpsertWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationUpsertWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationInvitationCreateManyOrganizationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),z.lazy(() => OrganizationInvitationWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),z.lazy(() => OrganizationInvitationWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),z.lazy(() => OrganizationInvitationWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),z.lazy(() => OrganizationInvitationWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => OrganizationInvitationUpdateWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationUpdateWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => OrganizationInvitationUpdateManyWithWhereWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationUpdateManyWithWhereWithoutOrganizationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => OrganizationInvitationScalarWhereInputSchema),z.lazy(() => OrganizationInvitationScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default OrganizationInvitationUncheckedUpdateManyWithoutOrganizationNestedInputSchema;
