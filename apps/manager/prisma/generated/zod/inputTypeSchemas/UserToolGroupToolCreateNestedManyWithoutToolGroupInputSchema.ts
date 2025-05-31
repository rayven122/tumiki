import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolCreateWithoutToolGroupInputSchema } from './UserToolGroupToolCreateWithoutToolGroupInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema } from './UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema';
import { UserToolGroupToolCreateOrConnectWithoutToolGroupInputSchema } from './UserToolGroupToolCreateOrConnectWithoutToolGroupInputSchema';
import { UserToolGroupToolCreateManyToolGroupInputEnvelopeSchema } from './UserToolGroupToolCreateManyToolGroupInputEnvelopeSchema';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';

export const UserToolGroupToolCreateNestedManyWithoutToolGroupInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateNestedManyWithoutToolGroupInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolCreateWithoutToolGroupInputSchema).array(),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserToolGroupToolCreateOrConnectWithoutToolGroupInputSchema),z.lazy(() => UserToolGroupToolCreateOrConnectWithoutToolGroupInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserToolGroupToolCreateManyToolGroupInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserToolGroupToolCreateNestedManyWithoutToolGroupInputSchema;
