import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupCreateWithoutResourceAclsInputSchema } from './OrganizationGroupCreateWithoutResourceAclsInputSchema';
import { OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema';
import { OrganizationGroupCreateOrConnectWithoutResourceAclsInputSchema } from './OrganizationGroupCreateOrConnectWithoutResourceAclsInputSchema';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';

export const OrganizationGroupCreateNestedOneWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationGroupCreateNestedOneWithoutResourceAclsInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationGroupCreateOrConnectWithoutResourceAclsInputSchema).optional(),
  connect: z.lazy(() => OrganizationGroupWhereUniqueInputSchema).optional()
}).strict();

export default OrganizationGroupCreateNestedOneWithoutResourceAclsInputSchema;
