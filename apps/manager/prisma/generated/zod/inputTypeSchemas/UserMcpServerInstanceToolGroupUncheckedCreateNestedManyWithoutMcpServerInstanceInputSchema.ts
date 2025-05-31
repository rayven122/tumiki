import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema';
import { UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputEnvelopeSchema } from './UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputEnvelopeSchema';
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from './UserMcpServerInstanceToolGroupWhereUniqueInputSchema';

export const UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutMcpServerInstanceInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema).array(),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutMcpServerInstanceInputSchema;
