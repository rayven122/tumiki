import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInputSchema';
import { UserToolGroupToolCreateManyUserMcpServerConfigInputEnvelopeSchema } from './UserToolGroupToolCreateManyUserMcpServerConfigInputEnvelopeSchema';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';

export const UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema).array(),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolCreateOrConnectWithoutUserMcpServerConfigInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserToolGroupToolCreateManyUserMcpServerConfigInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema;
