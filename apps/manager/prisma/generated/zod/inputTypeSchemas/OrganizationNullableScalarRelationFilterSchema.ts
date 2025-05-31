import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';

export const OrganizationNullableScalarRelationFilterSchema: z.ZodType<Prisma.OrganizationNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => OrganizationWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => OrganizationWhereInputSchema).optional().nullable()
}).strict();

export default OrganizationNullableScalarRelationFilterSchema;
