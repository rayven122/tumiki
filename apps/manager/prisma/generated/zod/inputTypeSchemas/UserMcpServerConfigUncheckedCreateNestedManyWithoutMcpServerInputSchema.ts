import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateWithoutMcpServerInputSchema } from './UserMcpServerConfigCreateWithoutMcpServerInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema';
import { UserMcpServerConfigCreateOrConnectWithoutMcpServerInputSchema } from './UserMcpServerConfigCreateOrConnectWithoutMcpServerInputSchema';
import { UserMcpServerConfigCreateManyMcpServerInputEnvelopeSchema } from './UserMcpServerConfigCreateManyMcpServerInputEnvelopeSchema';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';

export const UserMcpServerConfigUncheckedCreateNestedManyWithoutMcpServerInputSchema: z.ZodType<Prisma.UserMcpServerConfigUncheckedCreateNestedManyWithoutMcpServerInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigCreateWithoutMcpServerInputSchema).array(),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutMcpServerInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerConfigCreateManyMcpServerInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerConfigUncheckedCreateNestedManyWithoutMcpServerInputSchema;
