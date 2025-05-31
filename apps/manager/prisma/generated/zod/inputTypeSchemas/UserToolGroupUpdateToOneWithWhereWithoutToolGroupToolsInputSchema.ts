import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';
import { UserToolGroupUpdateWithoutToolGroupToolsInputSchema } from './UserToolGroupUpdateWithoutToolGroupToolsInputSchema';
import { UserToolGroupUncheckedUpdateWithoutToolGroupToolsInputSchema } from './UserToolGroupUncheckedUpdateWithoutToolGroupToolsInputSchema';

export const UserToolGroupUpdateToOneWithWhereWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.UserToolGroupUpdateToOneWithWhereWithoutToolGroupToolsInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserToolGroupUpdateWithoutToolGroupToolsInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutToolGroupToolsInputSchema) ]),
}).strict();

export default UserToolGroupUpdateToOneWithWhereWithoutToolGroupToolsInputSchema;
