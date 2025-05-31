import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupWhereInputSchema } from './UserMcpServerInstanceToolGroupWhereInputSchema';

export const UserMcpServerInstanceToolGroupListRelationFilterSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupListRelationFilter> = z.object({
  every: z.lazy(() => UserMcpServerInstanceToolGroupWhereInputSchema).optional(),
  some: z.lazy(() => UserMcpServerInstanceToolGroupWhereInputSchema).optional(),
  none: z.lazy(() => UserMcpServerInstanceToolGroupWhereInputSchema).optional()
}).strict();

export default UserMcpServerInstanceToolGroupListRelationFilterSchema;
