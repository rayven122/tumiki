import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { AccountOrderByRelationAggregateInputSchema } from './AccountOrderByRelationAggregateInputSchema';
import { SessionOrderByRelationAggregateInputSchema } from './SessionOrderByRelationAggregateInputSchema';
import { UserToolGroupOrderByRelationAggregateInputSchema } from './UserToolGroupOrderByRelationAggregateInputSchema';
import { UserMcpServerConfigOrderByRelationAggregateInputSchema } from './UserMcpServerConfigOrderByRelationAggregateInputSchema';
import { UserMcpServerInstanceOrderByRelationAggregateInputSchema } from './UserMcpServerInstanceOrderByRelationAggregateInputSchema';
import { OrganizationOrderByRelationAggregateInputSchema } from './OrganizationOrderByRelationAggregateInputSchema';
import { OrganizationMemberOrderByRelationAggregateInputSchema } from './OrganizationMemberOrderByRelationAggregateInputSchema';
import { OrganizationInvitationOrderByRelationAggregateInputSchema } from './OrganizationInvitationOrderByRelationAggregateInputSchema';

export const UserOrderByWithRelationInputSchema: z.ZodType<Prisma.UserOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  email: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  emailVerified: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  image: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  role: z.lazy(() => SortOrderSchema).optional(),
  accounts: z.lazy(() => AccountOrderByRelationAggregateInputSchema).optional(),
  sessions: z.lazy(() => SessionOrderByRelationAggregateInputSchema).optional(),
  toolGroups: z.lazy(() => UserToolGroupOrderByRelationAggregateInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigOrderByRelationAggregateInputSchema).optional(),
  mcpServerInstances: z.lazy(() => UserMcpServerInstanceOrderByRelationAggregateInputSchema).optional(),
  organizations: z.lazy(() => OrganizationOrderByRelationAggregateInputSchema).optional(),
  members: z.lazy(() => OrganizationMemberOrderByRelationAggregateInputSchema).optional(),
  invitations: z.lazy(() => OrganizationInvitationOrderByRelationAggregateInputSchema).optional()
}).strict();

export default UserOrderByWithRelationInputSchema;
