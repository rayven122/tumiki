import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { UserMcpServerInstanceOrderByWithRelationInputSchema } from './UserMcpServerInstanceOrderByWithRelationInputSchema';
import { UserOrderByWithRelationInputSchema } from './UserOrderByWithRelationInputSchema';
import { UserToolGroupToolOrderByRelationAggregateInputSchema } from './UserToolGroupToolOrderByRelationAggregateInputSchema';
import { OrganizationOrderByWithRelationInputSchema } from './OrganizationOrderByWithRelationInputSchema';
import { UserMcpServerInstanceToolGroupOrderByRelationAggregateInputSchema } from './UserMcpServerInstanceToolGroupOrderByRelationAggregateInputSchema';

export const UserToolGroupOrderByWithRelationInputSchema: z.ZodType<Prisma.UserToolGroupOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  isEnabled: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceOrderByWithRelationInputSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolOrderByRelationAggregateInputSchema).optional(),
  organization: z.lazy(() => OrganizationOrderByWithRelationInputSchema).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupOrderByRelationAggregateInputSchema).optional()
}).strict();

export default UserToolGroupOrderByWithRelationInputSchema;
