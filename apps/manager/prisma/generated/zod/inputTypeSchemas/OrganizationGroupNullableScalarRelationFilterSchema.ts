import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereInputSchema } from './OrganizationGroupWhereInputSchema';

export const OrganizationGroupNullableScalarRelationFilterSchema: z.ZodType<Prisma.OrganizationGroupNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => OrganizationGroupWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => OrganizationGroupWhereInputSchema).optional().nullable()
}).strict();

export default OrganizationGroupNullableScalarRelationFilterSchema;
