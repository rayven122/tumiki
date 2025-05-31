import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { IntFilterSchema } from './IntFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const UserToolGroupToolScalarWhereInputSchema: z.ZodType<Prisma.UserToolGroupToolScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserToolGroupToolScalarWhereInputSchema),z.lazy(() => UserToolGroupToolScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserToolGroupToolScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserToolGroupToolScalarWhereInputSchema),z.lazy(() => UserToolGroupToolScalarWhereInputSchema).array() ]).optional(),
  userMcpServerConfigId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  toolGroupId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  toolId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  sortOrder: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default UserToolGroupToolScalarWhereInputSchema;
