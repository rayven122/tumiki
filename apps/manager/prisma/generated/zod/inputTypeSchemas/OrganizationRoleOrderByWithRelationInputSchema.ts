import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { OrganizationOrderByWithRelationInputSchema } from './OrganizationOrderByWithRelationInputSchema';
import { RolePermissionOrderByRelationAggregateInputSchema } from './RolePermissionOrderByRelationAggregateInputSchema';
import { OrganizationMemberOrderByRelationAggregateInputSchema } from './OrganizationMemberOrderByRelationAggregateInputSchema';
import { OrganizationGroupOrderByRelationAggregateInputSchema } from './OrganizationGroupOrderByRelationAggregateInputSchema';

export const OrganizationRoleOrderByWithRelationInputSchema: z.ZodType<Prisma.OrganizationRoleOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  isDefault: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  organization: z.lazy(() => OrganizationOrderByWithRelationInputSchema).optional(),
  permissions: z.lazy(() => RolePermissionOrderByRelationAggregateInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberOrderByRelationAggregateInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupOrderByRelationAggregateInputSchema).optional()
}).strict();

export default OrganizationRoleOrderByWithRelationInputSchema;
