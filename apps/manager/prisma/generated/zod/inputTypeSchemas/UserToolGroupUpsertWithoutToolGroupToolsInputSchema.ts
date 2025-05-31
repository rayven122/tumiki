import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupUpdateWithoutToolGroupToolsInputSchema } from './UserToolGroupUpdateWithoutToolGroupToolsInputSchema';
import { UserToolGroupUncheckedUpdateWithoutToolGroupToolsInputSchema } from './UserToolGroupUncheckedUpdateWithoutToolGroupToolsInputSchema';
import { UserToolGroupCreateWithoutToolGroupToolsInputSchema } from './UserToolGroupCreateWithoutToolGroupToolsInputSchema';
import { UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema } from './UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';

export const UserToolGroupUpsertWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.UserToolGroupUpsertWithoutToolGroupToolsInput> = z.object({
  update: z.union([ z.lazy(() => UserToolGroupUpdateWithoutToolGroupToolsInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutToolGroupToolsInputSchema) ]),
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutToolGroupToolsInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema) ]),
  where: z.lazy(() => UserToolGroupWhereInputSchema).optional()
}).strict();

export default UserToolGroupUpsertWithoutToolGroupToolsInputSchema;
