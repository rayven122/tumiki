import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereInputSchema } from './OrganizationRoleWhereInputSchema';

export const OrganizationRoleListRelationFilterSchema: z.ZodType<Prisma.OrganizationRoleListRelationFilter> = z.object({
  every: z.lazy(() => OrganizationRoleWhereInputSchema).optional(),
  some: z.lazy(() => OrganizationRoleWhereInputSchema).optional(),
  none: z.lazy(() => OrganizationRoleWhereInputSchema).optional()
}).strict();

export default OrganizationRoleListRelationFilterSchema;
