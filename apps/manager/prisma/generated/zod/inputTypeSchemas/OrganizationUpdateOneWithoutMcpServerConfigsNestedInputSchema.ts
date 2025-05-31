import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutMcpServerConfigsInputSchema } from './OrganizationCreateWithoutMcpServerConfigsInputSchema';
import { OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema } from './OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { OrganizationCreateOrConnectWithoutMcpServerConfigsInputSchema } from './OrganizationCreateOrConnectWithoutMcpServerConfigsInputSchema';
import { OrganizationUpsertWithoutMcpServerConfigsInputSchema } from './OrganizationUpsertWithoutMcpServerConfigsInputSchema';
import { OrganizationWhereInputSchema } from './OrganizationWhereInputSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema } from './OrganizationUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema';
import { OrganizationUpdateWithoutMcpServerConfigsInputSchema } from './OrganizationUpdateWithoutMcpServerConfigsInputSchema';
import { OrganizationUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './OrganizationUncheckedUpdateWithoutMcpServerConfigsInputSchema';

export const OrganizationUpdateOneWithoutMcpServerConfigsNestedInputSchema: z.ZodType<Prisma.OrganizationUpdateOneWithoutMcpServerConfigsNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutMcpServerConfigsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationCreateOrConnectWithoutMcpServerConfigsInputSchema).optional(),
  upsert: z.lazy(() => OrganizationUpsertWithoutMcpServerConfigsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => OrganizationWhereInputSchema) ]).optional(),
  connect: z.lazy(() => OrganizationWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrganizationUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema),z.lazy(() => OrganizationUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]).optional(),
}).strict();

export default OrganizationUpdateOneWithoutMcpServerConfigsNestedInputSchema;
