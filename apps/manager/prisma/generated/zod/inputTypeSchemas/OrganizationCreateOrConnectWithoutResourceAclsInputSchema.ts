import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationCreateWithoutResourceAclsInputSchema } from './OrganizationCreateWithoutResourceAclsInputSchema';
import { OrganizationUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationUncheckedCreateWithoutResourceAclsInputSchema';

export const OrganizationCreateOrConnectWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationCreateOrConnectWithoutResourceAclsInput> = z.object({
  where: z.lazy(() => OrganizationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutResourceAclsInputSchema) ]),
}).strict();

export default OrganizationCreateOrConnectWithoutResourceAclsInputSchema;
