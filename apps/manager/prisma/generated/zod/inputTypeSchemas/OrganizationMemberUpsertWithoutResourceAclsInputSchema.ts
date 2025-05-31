import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberUpdateWithoutResourceAclsInputSchema } from './OrganizationMemberUpdateWithoutResourceAclsInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutResourceAclsInputSchema } from './OrganizationMemberUncheckedUpdateWithoutResourceAclsInputSchema';
import { OrganizationMemberCreateWithoutResourceAclsInputSchema } from './OrganizationMemberCreateWithoutResourceAclsInputSchema';
import { OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema } from './OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema';
import { OrganizationMemberWhereInputSchema } from './OrganizationMemberWhereInputSchema';

export const OrganizationMemberUpsertWithoutResourceAclsInputSchema: z.ZodType<Prisma.OrganizationMemberUpsertWithoutResourceAclsInput> = z.object({
  update: z.union([ z.lazy(() => OrganizationMemberUpdateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutResourceAclsInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutResourceAclsInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutResourceAclsInputSchema) ]),
  where: z.lazy(() => OrganizationMemberWhereInputSchema).optional()
}).strict();

export default OrganizationMemberUpsertWithoutResourceAclsInputSchema;
