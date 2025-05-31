import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationUpdateWithoutResourceAclsInputSchema } from './OrganizationUpdateWithoutResourceAclsInputSchema';
import { OrganizationUncheckedUpdateWithoutResourceAclsInputSchema } from './OrganizationUncheckedUpdateWithoutResourceAclsInputSchema';
import { OrganizationCreateWithoutResourceAclsInputSchema } from './OrganizationCreateWithoutResourceAclsInputSchema';
import { OrganizationUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationUncheckedCreateWithoutResourceAclsInputSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';

export const OrganizationUpsertWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationUpsertWithoutResourceAclsInput> = z.object({
  update: z.union([ z.lazy(() => OrganizationUpdateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutResourceAclsInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutResourceAclsInputSchema) ]),
  where: z.lazy(() => OrganizationWhereInputSchema).optional()
}).strict();

export default OrganizationUpsertWithoutResourceAclsInputSchema;
