import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';

export const OrganizationListRelationFilterSchema: z.ZodType<Prisma.OrganizationListRelationFilter> = z.object({
  every: z.lazy(() => OrganizationWhereInputSchema).optional(),
  some: z.lazy(() => OrganizationWhereInputSchema).optional(),
  none: z.lazy(() => OrganizationWhereInputSchema).optional()
}).strict();

export default OrganizationListRelationFilterSchema;
