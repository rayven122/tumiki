import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const OrganizationGroupScalarWhereInputSchema: z.ZodType<Prisma.OrganizationGroupScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrganizationGroupScalarWhereInputSchema),z.lazy(() => OrganizationGroupScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrganizationGroupScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrganizationGroupScalarWhereInputSchema),z.lazy(() => OrganizationGroupScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  organizationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default OrganizationGroupScalarWhereInputSchema;
