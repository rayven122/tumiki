import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateWithoutUserInputSchema } from './UserMcpServerInstanceCreateWithoutUserInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema';
import { UserMcpServerInstanceCreateOrConnectWithoutUserInputSchema } from './UserMcpServerInstanceCreateOrConnectWithoutUserInputSchema';
import { UserMcpServerInstanceCreateManyUserInputEnvelopeSchema } from './UserMcpServerInstanceCreateManyUserInputEnvelopeSchema';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';

export const UserMcpServerInstanceUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceCreateWithoutUserInputSchema).array(),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutUserInputSchema),z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerInstanceCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerInstanceUncheckedCreateNestedManyWithoutUserInputSchema;
