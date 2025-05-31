import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateWithoutResourceAclsInputSchema } from './OrganizationMemberCreateWithoutResourceAclsInputSchema';
import { OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema';
import { OrganizationMemberCreateOrConnectWithoutResourceAclsInputSchema } from './OrganizationMemberCreateOrConnectWithoutResourceAclsInputSchema';
import { OrganizationMemberUpsertWithoutResourceAclsInputSchema } from './OrganizationMemberUpsertWithoutResourceAclsInputSchema';
import { OrganizationMemberWhereInputSchema } from './OrganizationMemberWhereInputSchema';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateToOneWithWhereWithoutResourceAclsInputSchema } from './OrganizationMemberUpdateToOneWithWhereWithoutResourceAclsInputSchema';
import { OrganizationMemberUpdateWithoutResourceAclsInputSchema } from './OrganizationMemberUpdateWithoutResourceAclsInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutResourceAclsInputSchema } from './OrganizationMemberUncheckedUpdateWithoutResourceAclsInputSchema';

export const OrganizationMemberUpdateOneWithoutResourceAclsNestedInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateOneWithoutResourceAclsNestedInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => OrganizationMemberCreateOrConnectWithoutResourceAclsInputSchema).optional(),
  upsert: z.lazy(() => OrganizationMemberUpsertWithoutResourceAclsInputSchema).optional(),
  disconnect: z.union([ z.boolean(),z.lazy(() => OrganizationMemberWhereInputSchema) ]).optional(),
  delete: z.union([ z.boolean(),z.lazy(() => OrganizationMemberWhereInputSchema) ]).optional(),
  connect: z.lazy(() => OrganizationMemberWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => OrganizationMemberUpdateToOneWithWhereWithoutResourceAclsInputSchema),z.lazy(() => OrganizationMemberUpdateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutResourceAclsInputSchema) ]).optional(),
}).strict();

export default OrganizationMemberUpdateOneWithoutResourceAclsNestedInputSchema;
