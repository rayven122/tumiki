import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { UserMcpServerInstanceOrderByWithRelationInputSchema } from './UserMcpServerInstanceOrderByWithRelationInputSchema';
import { UserToolGroupOrderByWithRelationInputSchema } from './UserToolGroupOrderByWithRelationInputSchema';

export const UserMcpServerInstanceToolGroupOrderByWithRelationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupOrderByWithRelationInput> = z.object({
  mcpServerInstanceId: z.lazy(() => SortOrderSchema).optional(),
  toolGroupId: z.lazy(() => SortOrderSchema).optional(),
  sortOrder: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceOrderByWithRelationInputSchema).optional(),
  toolGroup: z.lazy(() => UserToolGroupOrderByWithRelationInputSchema).optional()
}).strict();

export default UserMcpServerInstanceToolGroupOrderByWithRelationInputSchema;
