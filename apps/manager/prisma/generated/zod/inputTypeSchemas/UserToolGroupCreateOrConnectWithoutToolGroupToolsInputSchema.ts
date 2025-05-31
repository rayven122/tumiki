import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupCreateWithoutToolGroupToolsInputSchema } from './UserToolGroupCreateWithoutToolGroupToolsInputSchema';
import { UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema } from './UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema';

export const UserToolGroupCreateOrConnectWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.UserToolGroupCreateOrConnectWithoutToolGroupToolsInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutToolGroupToolsInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema) ]),
}).strict();

export default UserToolGroupCreateOrConnectWithoutToolGroupToolsInputSchema;
