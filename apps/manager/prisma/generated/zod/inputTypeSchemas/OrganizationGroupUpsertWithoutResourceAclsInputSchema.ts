import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupUpdateWithoutResourceAclsInputSchema } from './OrganizationGroupUpdateWithoutResourceAclsInputSchema';
import { OrganizationGroupUncheckedUpdateWithoutResourceAclsInputSchema } from './OrganizationGroupUncheckedUpdateWithoutResourceAclsInputSchema';
import { OrganizationGroupCreateWithoutResourceAclsInputSchema } from './OrganizationGroupCreateWithoutResourceAclsInputSchema';
import { OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema';
import { OrganizationGroupWhereInputSchema } from './OrganizationGroupWhereInputSchema';

export const OrganizationGroupUpsertWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationGroupUpsertWithoutResourceAclsInput> = z.object({
  update: z.union([ z.lazy(() => OrganizationGroupUpdateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateWithoutResourceAclsInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema) ]),
  where: z.lazy(() => OrganizationGroupWhereInputSchema).optional()
}).strict();

export default OrganizationGroupUpsertWithoutResourceAclsInputSchema;
