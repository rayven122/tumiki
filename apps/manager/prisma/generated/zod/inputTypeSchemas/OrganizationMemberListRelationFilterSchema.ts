import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereInputSchema } from './OrganizationMemberWhereInputSchema';

export const OrganizationMemberListRelationFilterSchema: z.ZodType<Prisma.OrganizationMemberListRelationFilter> = z.object({
  every: z.lazy(() => OrganizationMemberWhereInputSchema).optional(),
  some: z.lazy(() => OrganizationMemberWhereInputSchema).optional(),
  none: z.lazy(() => OrganizationMemberWhereInputSchema).optional()
}).strict();

export default OrganizationMemberListRelationFilterSchema;
