import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutGroupsInputSchema } from './OrganizationCreateWithoutGroupsInputSchema';
import { OrganizationUncheckedCreateWithoutGroupsInputSchema } from './OrganizationUncheckedCreateWithoutGroupsInputSchema';
import { OrganizationCreateOrConnectWithoutGroupsInputSchema } from './OrganizationCreateOrConnectWithoutGroupsInputSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';

export const OrganizationCreateNestedOneWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationCreateNestedOneWithoutGroupsInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutGroupsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationCreateOrConnectWithoutGroupsInputSchema).optional(),
  connect: z.lazy(() => OrganizationWhereUniqueInputSchema).optional()
}).strict();

export default OrganizationCreateNestedOneWithoutGroupsInputSchema;
