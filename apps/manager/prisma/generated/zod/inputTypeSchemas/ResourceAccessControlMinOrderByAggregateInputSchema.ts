import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const ResourceAccessControlMinOrderByAggregateInputSchema: z.ZodType<Prisma.ResourceAccessControlMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  resourceType: z.lazy(() => SortOrderSchema).optional(),
  resourceId: z.lazy(() => SortOrderSchema).optional(),
  memberId: z.lazy(() => SortOrderSchema).optional(),
  groupId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default ResourceAccessControlMinOrderByAggregateInputSchema;
