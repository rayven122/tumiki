import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';

export const UserMcpServerInstanceListRelationFilterSchema: z.ZodType<Prisma.UserMcpServerInstanceListRelationFilter> = z.object({
  every: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional(),
  some: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional(),
  none: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional()
}).strict();

export default UserMcpServerInstanceListRelationFilterSchema;
