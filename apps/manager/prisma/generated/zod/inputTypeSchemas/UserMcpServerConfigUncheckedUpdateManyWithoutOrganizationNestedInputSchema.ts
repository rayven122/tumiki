import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateWithoutOrganizationInputSchema } from './UserMcpServerConfigCreateWithoutOrganizationInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema';
import { UserMcpServerConfigCreateOrConnectWithoutOrganizationInputSchema } from './UserMcpServerConfigCreateOrConnectWithoutOrganizationInputSchema';
import { UserMcpServerConfigUpsertWithWhereUniqueWithoutOrganizationInputSchema } from './UserMcpServerConfigUpsertWithWhereUniqueWithoutOrganizationInputSchema';
import { UserMcpServerConfigCreateManyOrganizationInputEnvelopeSchema } from './UserMcpServerConfigCreateManyOrganizationInputEnvelopeSchema';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigUpdateWithWhereUniqueWithoutOrganizationInputSchema } from './UserMcpServerConfigUpdateWithWhereUniqueWithoutOrganizationInputSchema';
import { UserMcpServerConfigUpdateManyWithWhereWithoutOrganizationInputSchema } from './UserMcpServerConfigUpdateManyWithWhereWithoutOrganizationInputSchema';
import { UserMcpServerConfigScalarWhereInputSchema } from './UserMcpServerConfigScalarWhereInputSchema';

export const UserMcpServerConfigUncheckedUpdateManyWithoutOrganizationNestedInputSchema: z.ZodType<Prisma.UserMcpServerConfigUncheckedUpdateManyWithoutOrganizationNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigCreateWithoutOrganizationInputSchema).array(),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserMcpServerConfigUpsertWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigUpsertWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerConfigCreateManyOrganizationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserMcpServerConfigUpdateWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigUpdateWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserMcpServerConfigUpdateManyWithWhereWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigUpdateManyWithWhereWithoutOrganizationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserMcpServerConfigScalarWhereInputSchema),z.lazy(() => UserMcpServerConfigScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerConfigUncheckedUpdateManyWithoutOrganizationNestedInputSchema;
