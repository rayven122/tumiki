import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';

export const UserMcpServerInstanceScalarRelationFilterSchema: z.ZodType<Prisma.UserMcpServerInstanceScalarRelationFilter> = z.object({
  is: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional(),
  isNot: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional()
}).strict();

export default UserMcpServerInstanceScalarRelationFilterSchema;
