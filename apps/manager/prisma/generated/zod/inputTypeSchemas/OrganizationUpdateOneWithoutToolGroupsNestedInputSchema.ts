import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutToolGroupsInputSchema } from './OrganizationCreateWithoutToolGroupsInputSchema';
import { OrganizationUncheckedCreateWithoutToolGroupsInputSchema } from './OrganizationUncheckedCreateWithoutToolGroupsInputSchema';
import { OrganizationCreateOrConnectWithoutToolGroupsInputSchema } from './OrganizationCreateOrConnectWithoutToolGroupsInputSchema';
import { OrganizationUpsertWithoutToolGroupsInputSchema } from './OrganizationUpsertWithoutToolGroupsInputSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationUpdateToOneWithWhereWithoutToolGroupsInputSchema } from './OrganizationUpdateToOneWithWhereWithoutToolGroupsInputSchema';
import { OrganizationUpdateWithoutToolGroupsInputSchema } from './OrganizationUpdateWithoutToolGroupsInputSchema';
import { OrganizationUncheckedUpdateWithoutToolGroupsInputSchema } from './OrganizationUncheckedUpdateWithoutToolGroupsInputSchema';

export const OrganizationUpdateOneWithoutToolGroupsNestedInputSchema: z.ZodType<Prisma.OrganizationUpdateOneWithoutToolGroupsNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutToolGroupsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutToolGroupsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationCreateOrConnectWithoutToolGroupsInputSchema).optional(),
  upsert: z.lazy(() => OrganizationUpsertWithoutToolGroupsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  connect: z.lazy(() => OrganizationWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrganizationUpdateToOneWithWhereWithoutToolGroupsInputSchema),z.lazy(() => OrganizationUpdateWithoutToolGroupsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutToolGroupsInputSchema) ]).optional(),
}).strict();

export default OrganizationUpdateOneWithoutToolGroupsNestedInputSchema;
