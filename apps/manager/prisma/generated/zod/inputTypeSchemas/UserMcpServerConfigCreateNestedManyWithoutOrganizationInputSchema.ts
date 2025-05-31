import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateWithoutOrganizationInputSchema } from './UserMcpServerConfigCreateWithoutOrganizationInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema';
import { UserMcpServerConfigCreateOrConnectWithoutOrganizationInputSchema } from './UserMcpServerConfigCreateOrConnectWithoutOrganizationInputSchema';
import { UserMcpServerConfigCreateManyOrganizationInputEnvelopeSchema } from './UserMcpServerConfigCreateManyOrganizationInputEnvelopeSchema';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';

export const UserMcpServerConfigCreateNestedManyWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateNestedManyWithoutOrganizationInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigCreateWithoutOrganizationInputSchema).array(),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerConfigCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerConfigCreateManyOrganizationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerConfigCreateNestedManyWithoutOrganizationInputSchema;
