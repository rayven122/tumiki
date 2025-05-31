import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereInputSchema } from './OrganizationGroupWhereInputSchema';
import { OrganizationGroupUpdateWithoutResourceAclsInputSchema } from './OrganizationGroupUpdateWithoutResourceAclsInputSchema';
import { OrganizationGroupUncheckedUpdateWithoutResourceAclsInputSchema } from './OrganizationGroupUncheckedUpdateWithoutResourceAclsInputSchema';

export const OrganizationGroupUpdateToOneWithWhereWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateToOneWithWhereWithoutResourceAclsInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrganizationGroupUpdateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateWithoutResourceAclsInputSchema) ]),
}).strict();

export default OrganizationGroupUpdateToOneWithWhereWithoutResourceAclsInputSchema;
