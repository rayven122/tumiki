import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupCreateWithoutResourceAclsInputSchema } from './OrganizationGroupCreateWithoutResourceAclsInputSchema';
import { OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema';

export const OrganizationGroupCreateOrConnectWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationGroupCreateOrConnectWithoutResourceAclsInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema) ]),
}).strict();

export default OrganizationGroupCreateOrConnectWithoutResourceAclsInputSchema;
