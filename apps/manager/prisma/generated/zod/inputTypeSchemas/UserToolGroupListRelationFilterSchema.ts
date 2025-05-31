import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';

export const UserToolGroupListRelationFilterSchema: z.ZodType<Prisma.UserToolGroupListRelationFilter> = z.object({
  every: z.lazy(() => UserToolGroupWhereInputSchema).optional(),
  some: z.lazy(() => UserToolGroupWhereInputSchema).optional(),
  none: z.lazy(() => UserToolGroupWhereInputSchema).optional()
}).strict();

export default UserToolGroupListRelationFilterSchema;
