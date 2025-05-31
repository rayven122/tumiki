import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationWhereInputSchema } from './OrganizationInvitationWhereInputSchema';

export const OrganizationInvitationListRelationFilterSchema: z.ZodType<Prisma.OrganizationInvitationListRelationFilter> = z.object({
  every: z.lazy(() => OrganizationInvitationWhereInputSchema).optional(),
  some: z.lazy(() => OrganizationInvitationWhereInputSchema).optional(),
  none: z.lazy(() => OrganizationInvitationWhereInputSchema).optional()
}).strict();

export default OrganizationInvitationListRelationFilterSchema;
