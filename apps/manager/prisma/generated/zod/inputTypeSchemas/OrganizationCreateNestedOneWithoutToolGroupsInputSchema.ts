import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutToolGroupsInputSchema } from './OrganizationCreateWithoutToolGroupsInputSchema';
import { OrganizationUncheckedCreateWithoutToolGroupsInputSchema } from './OrganizationUncheckedCreateWithoutToolGroupsInputSchema';
import { OrganizationCreateOrConnectWithoutToolGroupsInputSchema } from './OrganizationCreateOrConnectWithoutToolGroupsInputSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';

export const OrganizationCreateNestedOneWithoutToolGroupsInputSchema: z.ZodType<Prisma.OrganizationCreateNestedOneWithoutToolGroupsInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutToolGroupsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutToolGroupsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationCreateOrConnectWithoutToolGroupsInputSchema).optional(),
  connect: z.lazy(() => OrganizationWhereUniqueInputSchema).optional()
}).strict();

export default OrganizationCreateNestedOneWithoutToolGroupsInputSchema;
