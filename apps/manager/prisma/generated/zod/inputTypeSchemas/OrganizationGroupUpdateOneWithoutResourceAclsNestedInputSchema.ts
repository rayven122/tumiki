import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupCreateWithoutResourceAclsInputSchema } from './OrganizationGroupCreateWithoutResourceAclsInputSchema';
import { OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema';
import { OrganizationGroupCreateOrConnectWithoutResourceAclsInputSchema } from './OrganizationGroupCreateOrConnectWithoutResourceAclsInputSchema';
import { OrganizationGroupUpsertWithoutResourceAclsInputSchema } from './OrganizationGroupUpsertWithoutResourceAclsInputSchema';
import { OrganizationGroupWhereInputSchema } from './OrganizationGroupWhereInputSchema';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupUpdateToOneWithWhereWithoutResourceAclsInputSchema } from './OrganizationGroupUpdateToOneWithWhereWithoutResourceAclsInputSchema';
import { OrganizationGroupUpdateWithoutResourceAclsInputSchema } from './OrganizationGroupUpdateWithoutResourceAclsInputSchema';
import { OrganizationGroupUncheckedUpdateWithoutResourceAclsInputSchema } from './OrganizationGroupUncheckedUpdateWithoutResourceAclsInputSchema';

export const OrganizationGroupUpdateOneWithoutResourceAclsNestedInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateOneWithoutResourceAclsNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutResourceAclsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationGroupCreateOrConnectWithoutResourceAclsInputSchema).optional(),
  upsert: z.lazy(() => OrganizationGroupUpsertWithoutResourceAclsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => OrganizationGroupWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => OrganizationGroupWhereInputSchema) ]).optional(),
  connect: z.lazy(() => OrganizationGroupWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrganizationGroupUpdateToOneWithWhereWithoutResourceAclsInputSchema),z.lazy(() => OrganizationGroupUpdateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateWithoutResourceAclsInputSchema) ]).optional(),
}).strict();

export default OrganizationGroupUpdateOneWithoutResourceAclsNestedInputSchema;
