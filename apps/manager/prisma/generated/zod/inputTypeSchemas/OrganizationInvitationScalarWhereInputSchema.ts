import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { StringNullableListFilterSchema } from './StringNullableListFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const OrganizationInvitationScalarWhereInputSchema: z.ZodType<Prisma.OrganizationInvitationScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => OrganizationInvitationScalarWhereInputSchema),z.lazy(() => OrganizationInvitationScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => OrganizationInvitationScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => OrganizationInvitationScalarWhereInputSchema),z.lazy(() => OrganizationInvitationScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  email: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  token: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  invitedBy: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  isAdmin: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  roleIds: z.lazy(() => StringNullableListFilterSchema).optional(),
  groupIds: z.lazy(() => StringNullableListFilterSchema).optional(),
  expires: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default OrganizationInvitationScalarWhereInputSchema;
