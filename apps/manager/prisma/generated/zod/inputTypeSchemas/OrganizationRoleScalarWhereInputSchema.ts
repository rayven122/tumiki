import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const OrganizationRoleScalarWhereInputSchema: z.ZodType<Prisma.OrganizationRoleScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrganizationRoleScalarWhereInputSchema),z.lazy(() => OrganizationRoleScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrganizationRoleScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrganizationRoleScalarWhereInputSchema),z.lazy(() => OrganizationRoleScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  organizationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isDefault: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default OrganizationRoleScalarWhereInputSchema;
