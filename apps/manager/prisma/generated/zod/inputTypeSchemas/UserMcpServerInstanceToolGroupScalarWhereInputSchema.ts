import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { IntFilterSchema } from './IntFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const UserMcpServerInstanceToolGroupScalarWhereInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereInputSchema).array() ]).optional(),
  mcpServerInstanceId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  toolGroupId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  sortOrder: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default UserMcpServerInstanceToolGroupScalarWhereInputSchema;
