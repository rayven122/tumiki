import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutMcpServerInstancesInputSchema } from './OrganizationCreateWithoutMcpServerInstancesInputSchema';
import { OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema } from './OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema';
import { OrganizationCreateOrConnectWithoutMcpServerInstancesInputSchema } from './OrganizationCreateOrConnectWithoutMcpServerInstancesInputSchema';
import { OrganizationUpsertWithoutMcpServerInstancesInputSchema } from './OrganizationUpsertWithoutMcpServerInstancesInputSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationUpdateToOneWithWhereWithoutMcpServerInstancesInputSchema } from './OrganizationUpdateToOneWithWhereWithoutMcpServerInstancesInputSchema';
import { OrganizationUpdateWithoutMcpServerInstancesInputSchema } from './OrganizationUpdateWithoutMcpServerInstancesInputSchema';
import { OrganizationUncheckedUpdateWithoutMcpServerInstancesInputSchema } from './OrganizationUncheckedUpdateWithoutMcpServerInstancesInputSchema';

export const OrganizationUpdateOneWithoutMcpServerInstancesNestedInputSchema: z.ZodType<Prisma.OrganizationUpdateOneWithoutMcpServerInstancesNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutMcpServerInstancesInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutMcpServerInstancesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationCreateOrConnectWithoutMcpServerInstancesInputSchema).optional(),
  upsert: z.lazy(() => OrganizationUpsertWithoutMcpServerInstancesInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  connect: z.lazy(() => OrganizationWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrganizationUpdateToOneWithWhereWithoutMcpServerInstancesInputSchema),z.lazy(() => OrganizationUpdateWithoutMcpServerInstancesInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutMcpServerInstancesInputSchema) ]).optional(),
}).strict();

export default OrganizationUpdateOneWithoutMcpServerInstancesNestedInputSchema;
