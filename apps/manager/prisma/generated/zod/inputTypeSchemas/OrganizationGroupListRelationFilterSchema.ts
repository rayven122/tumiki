import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereInputSchema } from './OrganizationGroupWhereInputSchema';

export const OrganizationGroupListRelationFilterSchema: z.ZodType<Prisma.OrganizationGroupListRelationFilter> = z.object({
  every: z.lazy(() => OrganizationGroupWhereInputSchema).optional(),
  some: z.lazy(() => OrganizationGroupWhereInputSchema).optional(),
  none: z.lazy(() => OrganizationGroupWhereInputSchema).optional()
}).strict();

export default OrganizationGroupListRelationFilterSchema;
