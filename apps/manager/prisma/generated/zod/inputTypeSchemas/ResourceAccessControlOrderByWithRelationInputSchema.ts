import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { OrganizationOrderByWithRelationInputSchema } from './OrganizationOrderByWithRelationInputSchema';
import { OrganizationMemberOrderByWithRelationInputSchema } from './OrganizationMemberOrderByWithRelationInputSchema';
import { OrganizationGroupOrderByWithRelationInputSchema } from './OrganizationGroupOrderByWithRelationInputSchema';

export const ResourceAccessControlOrderByWithRelationInputSchema: z.ZodType<Prisma.ResourceAccessControlOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  resourceType: z.lazy(() => SortOrderSchema).optional(),
  resourceId: z.lazy(() => SortOrderSchema).optional(),
  memberId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  groupId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  allowedActions: z.lazy(() => SortOrderSchema).optional(),
  deniedActions: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  organization: z.lazy(() => OrganizationOrderByWithRelationInputSchema).optional(),
  member: z.lazy(() => OrganizationMemberOrderByWithRelationInputSchema).optional(),
  group: z.lazy(() => OrganizationGroupOrderByWithRelationInputSchema).optional()
}).strict();

export default ResourceAccessControlOrderByWithRelationInputSchema;
