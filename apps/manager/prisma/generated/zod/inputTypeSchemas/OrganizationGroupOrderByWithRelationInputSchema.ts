import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { OrganizationOrderByWithRelationInputSchema } from './OrganizationOrderByWithRelationInputSchema';
import { OrganizationMemberOrderByRelationAggregateInputSchema } from './OrganizationMemberOrderByRelationAggregateInputSchema';
import { OrganizationRoleOrderByRelationAggregateInputSchema } from './OrganizationRoleOrderByRelationAggregateInputSchema';
import { ResourceAccessControlOrderByRelationAggregateInputSchema } from './ResourceAccessControlOrderByRelationAggregateInputSchema';

export const OrganizationGroupOrderByWithRelationInputSchema: z.ZodType<Prisma.OrganizationGroupOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  organization: z.lazy(() => OrganizationOrderByWithRelationInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberOrderByRelationAggregateInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleOrderByRelationAggregateInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlOrderByRelationAggregateInputSchema).optional()
}).strict();

export default OrganizationGroupOrderByWithRelationInputSchema;
