import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';

export const UserToolGroupScalarRelationFilterSchema: z.ZodType<Prisma.UserToolGroupScalarRelationFilter> = z.object({
  is: z.lazy(() => UserToolGroupWhereInputSchema).optional(),
  isNot: z.lazy(() => UserToolGroupWhereInputSchema).optional()
}).strict();

export default UserToolGroupScalarRelationFilterSchema;
