import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { OrganizationInvitationCountOrderByAggregateInputSchema } from './OrganizationInvitationCountOrderByAggregateInputSchema';
import { OrganizationInvitationMaxOrderByAggregateInputSchema } from './OrganizationInvitationMaxOrderByAggregateInputSchema';
import { OrganizationInvitationMinOrderByAggregateInputSchema } from './OrganizationInvitationMinOrderByAggregateInputSchema';

export const OrganizationInvitationOrderByWithAggregationInputSchema: z.ZodType<Prisma.OrganizationInvitationOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  email: z.lazy(() => SortOrderSchema).optional(),
  token: z.lazy(() => SortOrderSchema).optional(),
  invitedBy: z.lazy(() => SortOrderSchema).optional(),
  isAdmin: z.lazy(() => SortOrderSchema).optional(),
  roleIds: z.lazy(() => SortOrderSchema).optional(),
  groupIds: z.lazy(() => SortOrderSchema).optional(),
  expires: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => OrganizationInvitationCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => OrganizationInvitationMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => OrganizationInvitationMinOrderByAggregateInputSchema).optional()
}).strict();

export default OrganizationInvitationOrderByWithAggregationInputSchema;
