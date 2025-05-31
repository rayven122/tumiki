import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { OrganizationOrderByWithRelationInputSchema } from './OrganizationOrderByWithRelationInputSchema';
import { UserOrderByWithRelationInputSchema } from './UserOrderByWithRelationInputSchema';
import { OrganizationRoleOrderByRelationAggregateInputSchema } from './OrganizationRoleOrderByRelationAggregateInputSchema';
import { OrganizationGroupOrderByRelationAggregateInputSchema } from './OrganizationGroupOrderByRelationAggregateInputSchema';
import { ResourceAccessControlOrderByRelationAggregateInputSchema } from './ResourceAccessControlOrderByRelationAggregateInputSchema';

export const OrganizationMemberOrderByWithRelationInputSchema: z.ZodType<Prisma.OrganizationMemberOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  isAdmin: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  organization: z.lazy(() => OrganizationOrderByWithRelationInputSchema).optional(),
  user: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleOrderByRelationAggregateInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupOrderByRelationAggregateInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlOrderByRelationAggregateInputSchema).optional()
}).strict();

export default OrganizationMemberOrderByWithRelationInputSchema;
