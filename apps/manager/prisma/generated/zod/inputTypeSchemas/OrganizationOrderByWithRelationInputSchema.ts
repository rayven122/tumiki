import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { UserOrderByWithRelationInputSchema } from './UserOrderByWithRelationInputSchema';
import { OrganizationMemberOrderByRelationAggregateInputSchema } from './OrganizationMemberOrderByRelationAggregateInputSchema';
import { OrganizationGroupOrderByRelationAggregateInputSchema } from './OrganizationGroupOrderByRelationAggregateInputSchema';
import { OrganizationRoleOrderByRelationAggregateInputSchema } from './OrganizationRoleOrderByRelationAggregateInputSchema';
import { ResourceAccessControlOrderByRelationAggregateInputSchema } from './ResourceAccessControlOrderByRelationAggregateInputSchema';
import { OrganizationInvitationOrderByRelationAggregateInputSchema } from './OrganizationInvitationOrderByRelationAggregateInputSchema';
import { UserToolGroupOrderByRelationAggregateInputSchema } from './UserToolGroupOrderByRelationAggregateInputSchema';
import { UserMcpServerConfigOrderByRelationAggregateInputSchema } from './UserMcpServerConfigOrderByRelationAggregateInputSchema';
import { UserMcpServerInstanceOrderByRelationAggregateInputSchema } from './UserMcpServerInstanceOrderByRelationAggregateInputSchema';

export const OrganizationOrderByWithRelationInputSchema: z.ZodType<Prisma.OrganizationOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  logoUrl: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  isDeleted: z.lazy(() => SortOrderSchema).optional(),
  createdBy: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  creator: z.lazy(() => UserOrderByWithRelationInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberOrderByRelationAggregateInputSchema).optional(),
  groups: z.lazy(() => OrganizationGroupOrderByRelationAggregateInputSchema).optional(),
  roles: z.lazy(() => OrganizationRoleOrderByRelationAggregateInputSchema).optional(),
  resourceAcls: z.lazy(() => ResourceAccessControlOrderByRelationAggregateInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationOrderByRelationAggregateInputSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupOrderByRelationAggregateInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigOrderByRelationAggregateInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceOrderByRelationAggregateInputSchema).optional()
}).strict();

export default OrganizationOrderByWithRelationInputSchema;
