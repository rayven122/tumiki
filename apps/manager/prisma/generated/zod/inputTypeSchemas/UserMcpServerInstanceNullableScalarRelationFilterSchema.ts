import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';

export const UserMcpServerInstanceNullableScalarRelationFilterSchema: z.ZodType<Prisma.UserMcpServerInstanceNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional().nullable()
}).strict();

export default UserMcpServerInstanceNullableScalarRelationFilterSchema;
