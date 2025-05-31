import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolCreateWithoutToolInputSchema } from './UserToolGroupToolCreateWithoutToolInputSchema';
import { UserToolGroupToolUncheckedCreateWithoutToolInputSchema } from './UserToolGroupToolUncheckedCreateWithoutToolInputSchema';
import { UserToolGroupToolCreateOrConnectWithoutToolInputSchema } from './UserToolGroupToolCreateOrConnectWithoutToolInputSchema';
import { UserToolGroupToolCreateManyToolInputEnvelopeSchema } from './UserToolGroupToolCreateManyToolInputEnvelopeSchema';
import { UserToolGroupToolWhereUniqueInputSchema } from './UserToolGroupToolWhereUniqueInputSchema';

export const UserToolGroupToolCreateNestedManyWithoutToolInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateNestedManyWithoutToolInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupToolCreateWithoutToolInputSchema),z.lazy(() => UserToolGroupToolCreateWithoutToolInputSchema).array(),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolInputSchema),z.lazy(() => UserToolGroupToolUncheckedCreateWithoutToolInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserToolGroupToolCreateOrConnectWithoutToolInputSchema),z.lazy(() => UserToolGroupToolCreateOrConnectWithoutToolInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserToolGroupToolCreateManyToolInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserToolGroupToolWhereUniqueInputSchema),z.lazy(() => UserToolGroupToolWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserToolGroupToolCreateNestedManyWithoutToolInputSchema;
