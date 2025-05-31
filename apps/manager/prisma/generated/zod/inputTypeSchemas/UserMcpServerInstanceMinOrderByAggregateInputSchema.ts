import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const UserMcpServerInstanceMinOrderByAggregateInputSchema: z.ZodType<Prisma.UserMcpServerInstanceMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  iconPath: z.lazy(() => SortOrderSchema).optional(),
  serverStatus: z.lazy(() => SortOrderSchema).optional(),
  serverType: z.lazy(() => SortOrderSchema).optional(),
  toolGroupId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default UserMcpServerInstanceMinOrderByAggregateInputSchema;
