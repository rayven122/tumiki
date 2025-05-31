import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateWithoutOrganizationInputSchema } from './UserMcpServerInstanceCreateWithoutOrganizationInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema';
import { UserMcpServerInstanceCreateOrConnectWithoutOrganizationInputSchema } from './UserMcpServerInstanceCreateOrConnectWithoutOrganizationInputSchema';
import { UserMcpServerInstanceUpsertWithWhereUniqueWithoutOrganizationInputSchema } from './UserMcpServerInstanceUpsertWithWhereUniqueWithoutOrganizationInputSchema';
import { UserMcpServerInstanceCreateManyOrganizationInputEnvelopeSchema } from './UserMcpServerInstanceCreateManyOrganizationInputEnvelopeSchema';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';
import { UserMcpServerInstanceUpdateWithWhereUniqueWithoutOrganizationInputSchema } from './UserMcpServerInstanceUpdateWithWhereUniqueWithoutOrganizationInputSchema';
import { UserMcpServerInstanceUpdateManyWithWhereWithoutOrganizationInputSchema } from './UserMcpServerInstanceUpdateManyWithWhereWithoutOrganizationInputSchema';
import { UserMcpServerInstanceScalarWhereInputSchema } from './UserMcpServerInstanceScalarWhereInputSchema';

export const UserMcpServerInstanceUpdateManyWithoutOrganizationNestedInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpdateManyWithoutOrganizationNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceCreateWithoutOrganizationInputSchema).array(),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  upsert: z.union([ z.lazy(() => UserMcpServerInstanceUpsertWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceUpsertWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerInstanceCreateManyOrganizationInputEnvelopeSchema).optional(),
  set: z.union([ z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).array() ]).optional(),
  disconnect: z.union([ z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).array() ]).optional(),
  delete: z.union([ z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).array() ]).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).array() ]).optional(),
  update: z.union([ z.lazy(() => UserMcpServerInstanceUpdateWithWhereUniqueWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceUpdateWithWhereUniqueWithoutOrganizationInputSchema).array() ]).optional(),
  updateMany: z.union([ z.lazy(() => UserMcpServerInstanceUpdateManyWithWhereWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceUpdateManyWithWhereWithoutOrganizationInputSchema).array() ]).optional(),
  deleteMany: z.union([ z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema),z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerInstanceUpdateManyWithoutOrganizationNestedInputSchema;
