import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereInputSchema } from './OrganizationMemberWhereInputSchema';

export const OrganizationMemberNullableScalarRelationFilterSchema: z.ZodType<Prisma.OrganizationMemberNullableScalarRelationFilter> = z.object({
  is: z.lazy(() => OrganizationMemberWhereInputSchema).optional().nullable(),
  isNot: z.lazy(() => OrganizationMemberWhereInputSchema).optional().nullable()
}).strict();

export default OrganizationMemberNullableScalarRelationFilterSchema;
