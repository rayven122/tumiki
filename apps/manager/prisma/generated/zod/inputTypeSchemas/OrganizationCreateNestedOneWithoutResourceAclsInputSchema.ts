import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutResourceAclsInputSchema } from './OrganizationCreateWithoutResourceAclsInputSchema';
import { OrganizationUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationUncheckedCreateWithoutResourceAclsInputSchema';
import { OrganizationCreateOrConnectWithoutResourceAclsInputSchema } from './OrganizationCreateOrConnectWithoutResourceAclsInputSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';

export const OrganizationCreateNestedOneWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationCreateNestedOneWithoutResourceAclsInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutResourceAclsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationCreateOrConnectWithoutResourceAclsInputSchema).optional(),
  connect: z.lazy(() => OrganizationWhereUniqueInputSchema).optional()
}).strict();

export default OrganizationCreateNestedOneWithoutResourceAclsInputSchema;
