import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberCreateWithoutResourceAclsInputSchema } from './OrganizationMemberCreateWithoutResourceAclsInputSchema';
import { OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema';

export const OrganizationMemberCreateOrConnectWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationMemberCreateOrConnectWithoutResourceAclsInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema) ]),
}).strict();

export default OrganizationMemberCreateOrConnectWithoutResourceAclsInputSchema;
