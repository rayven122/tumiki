import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateWithoutResourceAclsInputSchema } from './OrganizationCreateWithoutResourceAclsInputSchema';
import { OrganizationUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationUncheckedCreateWithoutResourceAclsInputSchema';
import { OrganizationCreateOrConnectWithoutResourceAclsInputSchema } from './OrganizationCreateOrConnectWithoutResourceAclsInputSchema';
import { OrganizationUpsertWithoutResourceAclsInputSchema } from './OrganizationUpsertWithoutResourceAclsInputSchema';
import { OrganizationWhereUniqueInputSchema } from './OrganizationWhereUniqueInputSchema';
import { OrganizationUpdateToOneWithWhereWithoutResourceAclsInputSchema } from './OrganizationUpdateToOneWithWhereWithoutResourceAclsInputSchema';
import { OrganizationUpdateWithoutResourceAclsInputSchema } from './OrganizationUpdateWithoutResourceAclsInputSchema';
import { OrganizationUncheckedUpdateWithoutResourceAclsInputSchema } from './OrganizationUncheckedUpdateWithoutResourceAclsInputSchema';

export const OrganizationUpdateOneRequiredWithoutResourceAclsNestedInputSchema: z.ZodType<Prisma.OrganizationUpdateOneRequiredWithoutResourceAclsNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationUncheckedCreateWithoutResourceAclsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationCreateOrConnectWithoutResourceAclsInputSchema).optional(),
  upsert: z.lazy(() => OrganizationUpsertWithoutResourceAclsInputSchema).optional(),
  connect: z.lazy(() => OrganizationWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrganizationUpdateToOneWithWhereWithoutResourceAclsInputSchema),z.lazy(() => OrganizationUpdateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationUncheckedUpdateWithoutResourceAclsInputSchema) ]).optional(),
}).strict();

export default OrganizationUpdateOneRequiredWithoutResourceAclsNestedInputSchema;
