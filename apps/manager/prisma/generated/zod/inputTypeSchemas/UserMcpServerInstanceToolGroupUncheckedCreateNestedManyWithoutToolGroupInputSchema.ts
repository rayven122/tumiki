import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupCreateManyToolGroupInputEnvelopeSchema } from './UserMcpServerInstanceToolGroupCreateManyToolGroupInputEnvelopeSchema';
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from './UserMcpServerInstanceToolGroupWhereUniqueInputSchema';

export const UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema).array(),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateWithoutToolGroupInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupCreateOrConnectWithoutToolGroupInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerInstanceToolGroupCreateManyToolGroupInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema;
