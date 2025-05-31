import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateWithoutUserInputSchema } from './UserToolGroupCreateWithoutUserInputSchema';
import { UserToolGroupUncheckedCreateWithoutUserInputSchema } from './UserToolGroupUncheckedCreateWithoutUserInputSchema';
import { UserToolGroupCreateOrConnectWithoutUserInputSchema } from './UserToolGroupCreateOrConnectWithoutUserInputSchema';
import { UserToolGroupCreateManyUserInputEnvelopeSchema } from './UserToolGroupCreateManyUserInputEnvelopeSchema';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';

export const UserToolGroupUncheckedCreateNestedManyWithoutUserInputSchema: z.ZodType<Prisma.UserToolGroupUncheckedCreateNestedManyWithoutUserInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutUserInputSchema),z.lazy(() => UserToolGroupCreateWithoutUserInputSchema).array(),z.lazy(() => UserToolGroupUncheckedCreateWithoutUserInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserToolGroupCreateOrConnectWithoutUserInputSchema),z.lazy(() => UserToolGroupCreateOrConnectWithoutUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserToolGroupCreateManyUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserToolGroupWhereUniqueInputSchema),z.lazy(() => UserToolGroupWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserToolGroupUncheckedCreateNestedManyWithoutUserInputSchema;
