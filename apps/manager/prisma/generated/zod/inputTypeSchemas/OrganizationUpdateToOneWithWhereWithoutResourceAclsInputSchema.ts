import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationUpdateWithoutResourceAclsInputSchema } from './OrganizationUpdateWithoutResourceAclsInputSchema';
import { OrganizationUncheckedUpdateWithoutResourceAclsInputSchema } from './OrganizationUncheckedUpdateWithoutResourceAclsInputSchema';

export const OrganizationUpdateToOneWithWhereWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationUpdateToOneWithWhereWithoutResourceAclsInput> = z.object({
  where: z.lazy(() => OrganizationWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => OrganizationUpdateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutResourceAclsInputSchema) ]),
}).strict();

export default OrganizationUpdateToOneWithWhereWithoutResourceAclsInputSchema;
