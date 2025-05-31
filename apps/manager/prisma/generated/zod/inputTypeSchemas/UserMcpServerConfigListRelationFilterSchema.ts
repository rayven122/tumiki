import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereInputSchema } from './UserMcpServerConfigWhereInputSchema';

export const UserMcpServerConfigListRelationFilterSchema: z.ZodType<Prisma.UserMcpServerConfigListRelationFilter> = z.object({
  every: z.lazy(() => UserMcpServerConfigWhereInputSchema).optional(),
  some: z.lazy(() => UserMcpServerConfigWhereInputSchema).optional(),
  none: z.lazy(() => UserMcpServerConfigWhereInputSchema).optional()
}).strict();

export default UserMcpServerConfigListRelationFilterSchema;
