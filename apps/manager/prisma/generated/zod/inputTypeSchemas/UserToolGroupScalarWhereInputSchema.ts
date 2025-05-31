import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const UserToolGroupScalarWhereInputSchema: z.ZodType<Prisma.UserToolGroupScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserToolGroupScalarWhereInputSchema),z.lazy(() => UserToolGroupScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserToolGroupScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserToolGroupScalarWhereInputSchema),z.lazy(() => UserToolGroupScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isEnabled: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default UserToolGroupScalarWhereInputSchema;
