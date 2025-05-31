import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { UserMcpServerInstanceToolGroupOrderByRelationAggregateInputSchema } from './UserMcpServerInstanceToolGroupOrderByRelationAggregateInputSchema';
import { UserToolGroupOrderByWithRelationInputSchema } from './UserToolGroupOrderByWithRelationInputSchema';
import { UserOrderByWithRelationInputSchema } from './UserOrderByWithRelationInputSchema';
import { OrganizationOrderByWithRelationInputSchema } from './OrganizationOrderByWithRelationInputSchema';

export const UserMcpServerInstanceOrderByWithRelationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  iconPath: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  serverStatus: z.lazy(() => SortOrderSchema).optional(),
  serverType: z.lazy(() => SortOrderSchema).optional(),
  toolGroupId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupOrderByRelationAggregateInputSchema).optional(),
  toolGroup: z.lazy(() => UserToolGroupOrderByWithRelationInputSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  organization: z.lazy(() => OrganizationOrderByWithRelationInputSchema).optional()
}).strict();

export default UserMcpServerInstanceOrderByWithRelationInputSchema;
