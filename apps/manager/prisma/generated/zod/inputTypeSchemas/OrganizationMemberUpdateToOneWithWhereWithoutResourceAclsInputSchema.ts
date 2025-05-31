import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereInputSchema } from './OrganizationMemberWhereInputSchema';
import { OrganizationMemberUpdateWithoutResourceAclsInputSchema } from './OrganizationMemberUpdateWithoutResourceAclsInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutResourceAclsInputSchema } from './OrganizationMemberUncheckedUpdateWithoutResourceAclsInputSchema';

export const OrganizationMemberUpdateToOneWithWhereWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateToOneWithWhereWithoutResourceAclsInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrganizationMemberUpdateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutResourceAclsInputSchema) ]),
}).strict();

export default OrganizationMemberUpdateToOneWithWhereWithoutResourceAclsInputSchema;
