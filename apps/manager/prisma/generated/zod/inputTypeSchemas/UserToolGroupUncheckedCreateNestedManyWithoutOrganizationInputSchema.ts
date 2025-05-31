import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateWithoutOrganizationInputSchema } from './UserToolGroupCreateWithoutOrganizationInputSchema';
import { UserToolGroupUncheckedCreateWithoutOrganizationInputSchema } from './UserToolGroupUncheckedCreateWithoutOrganizationInputSchema';
import { UserToolGroupCreateOrConnectWithoutOrganizationInputSchema } from './UserToolGroupCreateOrConnectWithoutOrganizationInputSchema';
import { UserToolGroupCreateManyOrganizationInputEnvelopeSchema } from './UserToolGroupCreateManyOrganizationInputEnvelopeSchema';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';

export const UserToolGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema: z.ZodType<Prisma.UserToolGroupUncheckedCreateNestedManyWithoutOrganizationInput> = z.object({
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupCreateWithoutOrganizationInputSchema).array(),z.lazy(() => UserToolGroupUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserToolGroupCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => UserToolGroupCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserToolGroupCreateManyOrganizationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserToolGroupWhereUniqueInputSchema),z.lazy(() => UserToolGroupWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserToolGroupUncheckedCreateNestedManyWithoutOrganizationInputSchema;
