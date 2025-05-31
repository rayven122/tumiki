import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolWhereInputSchema } from './UserToolGroupToolWhereInputSchema';

export const UserToolGroupToolListRelationFilterSchema: z.ZodType<Prisma.UserToolGroupToolListRelationFilter> = z.object({
  every: z.lazy(() => UserToolGroupToolWhereInputSchema).optional(),
  some: z.lazy(() => UserToolGroupToolWhereInputSchema).optional(),
  none: z.lazy(() => UserToolGroupToolWhereInputSchema).optional()
}).strict();

export default UserToolGroupToolListRelationFilterSchema;
