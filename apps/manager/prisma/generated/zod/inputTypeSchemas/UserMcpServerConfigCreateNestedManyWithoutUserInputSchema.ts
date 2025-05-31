import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateWithoutUserInputSchema } from './UserMcpServerConfigCreateWithoutUserInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutUserInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutUserInputSchema';
import { UserMcpServerConfigCreateOrConnectWithoutUserInputSchema } from './UserMcpServerConfigCreateOrConnectWithoutUserInputSchema';
import { UserMcpServerConfigCreateManyUserInputEnvelopeSchema } from './UserMcpServerConfigCreateManyUserInputEnvelopeSchema';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';

export const UserMcpServerConfigCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigCreateWithoutUserInputSchema).array(),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerConfigCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerConfigCreateNestedManyWithoutUserInputSchema;
