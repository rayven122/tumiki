import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutGroupsInputSchema } from './OrganizationCreateWithoutGroupsInputSchema';
import { OrganizationUncheckedCreateWithoutGroupsInputSchema } from './OrganizationUncheckedCreateWithoutGroupsInputSchema';
import { OrganizationCreateOrConnectWithoutGroupsInputSchema } from './OrganizationCreateOrConnectWithoutGroupsInputSchema';
import { OrganizationUpsertWithoutGroupsInputSchema } from './OrganizationUpsertWithoutGroupsInputSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationUpdateToOneWithWhereWithoutGroupsInputSchema } from './OrganizationUpdateToOneWithWhereWithoutGroupsInputSchema';
import { OrganizationUpdateWithoutGroupsInputSchema } from './OrganizationUpdateWithoutGroupsInputSchema';
import { OrganizationUncheckedUpdateWithoutGroupsInputSchema } from './OrganizationUncheckedUpdateWithoutGroupsInputSchema';

export const OrganizationUpdateOneRequiredWithoutGroupsNestedInputSchema: z.ZodType<Prisma.OrganizationUpdateOneRequiredWithoutGroupsNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutGroupsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutGroupsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationCreateOrConnectWithoutGroupsInputSchema).optional(),
  upsert: z.lazy(() => OrganizationUpsertWithoutGroupsInputSchema).optional(),
  connect: z.lazy(() => OrganizationWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrganizationUpdateToOneWithWhereWithoutGroupsInputSchema),z.lazy(() => OrganizationUpdateWithoutGroupsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutGroupsInputSchema) ]).optional(),
}).strict();

export default OrganizationUpdateOneRequiredWithoutGroupsNestedInputSchema;
