import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateWithoutResourceAclsInputSchema } from './OrganizationMemberCreateWithoutResourceAclsInputSchema';
import { OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema';
import { OrganizationMemberCreateOrConnectWithoutResourceAclsInputSchema } from './OrganizationMemberCreateOrConnectWithoutResourceAclsInputSchema';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';

export const OrganizationMemberCreateNestedOneWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationMemberCreateNestedOneWithoutResourceAclsInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationMemberCreateOrConnectWithoutResourceAclsInputSchema).optional(),
  connect: z.lazy(() => OrganizationMemberWhereUniqueInputSchema).optional()
}).strict();

export default OrganizationMemberCreateNestedOneWithoutResourceAclsInputSchema;
