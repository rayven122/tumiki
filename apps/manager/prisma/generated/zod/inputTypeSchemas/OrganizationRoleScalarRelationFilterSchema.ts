import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereInputSchema } from './OrganizationRoleWhereInputSchema';

export const OrganizationRoleScalarRelationFilterSchema: z.ZodType<Prisma.OrganizationRoleScalarRelationFilter> = z.object({
  is: z.lazy(() => OrganizationRoleWhereInputSchema).optional(),
  isNot: z.lazy(() => OrganizationRoleWhereInputSchema).optional()
}).strict();

export default OrganizationRoleScalarRelationFilterSchema;
