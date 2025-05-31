import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateWithoutToolGroupToolsInputSchema } from './UserToolGroupCreateWithoutToolGroupToolsInputSchema';
import { UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema } from './UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema';
import { UserToolGroupCreateOrConnectWithoutToolGroupToolsInputSchema } from './UserToolGroupCreateOrConnectWithoutToolGroupToolsInputSchema';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';

export const UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.UserToolGroupCreateNestedOneWithoutToolGroupToolsInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutToolGroupToolsInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserToolGroupCreateOrConnectWithoutToolGroupToolsInputSchema).optional(),
  connect: z.lazy(() => UserToolGroupWhereUniqueInputSchema).optional()
}).strict();

export default UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema;
