import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereInputSchema } from './UserMcpServerConfigWhereInputSchema';

export const UserMcpServerConfigScalarRelationFilterSchema: z.ZodType<Prisma.UserMcpServerConfigScalarRelationFilter> = z.object({
  is: z.lazy(() => UserMcpServerConfigWhereInputSchema).optional(),
  isNot: z.lazy(() => UserMcpServerConfigWhereInputSchema).optional()
}).strict();

export default UserMcpServerConfigScalarRelationFilterSchema;
