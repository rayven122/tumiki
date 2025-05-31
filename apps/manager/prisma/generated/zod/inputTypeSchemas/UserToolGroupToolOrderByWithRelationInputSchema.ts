import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { UserMcpServerConfigOrderByWithRelationInputSchema } from './UserMcpServerConfigOrderByWithRelationInputSchema';
import { UserToolGroupOrderByWithRelationInputSchema } from './UserToolGroupOrderByWithRelationInputSchema';
import { ToolOrderByWithRelationInputSchema } from './ToolOrderByWithRelationInputSchema';

export const UserToolGroupToolOrderByWithRelationInputSchema: z.ZodType<Prisma.UserToolGroupToolOrderByWithRelationInput> = z.object({
  userMcpServerConfigId: z.lazy(() => SortOrderSchema).optional(),
  toolGroupId: z.lazy(() => SortOrderSchema).optional(),
  toolId: z.lazy(() => SortOrderSchema).optional(),
  sortOrder: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  userMcpServerConfig: z.lazy(() => UserMcpServerConfigOrderByWithRelationInputSchema).optional(),
  toolGroup: z.lazy(() => UserToolGroupOrderByWithRelationInputSchema).optional(),
  tool: z.lazy(() => ToolOrderByWithRelationInputSchema).optional()
}).strict();

export default UserToolGroupToolOrderByWithRelationInputSchema;
