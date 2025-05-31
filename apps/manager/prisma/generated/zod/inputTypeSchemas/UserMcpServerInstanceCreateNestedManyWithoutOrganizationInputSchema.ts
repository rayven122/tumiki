import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateWithoutOrganizationInputSchema } from './UserMcpServerInstanceCreateWithoutOrganizationInputSchema';
import { UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema } from './UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema';
import { UserMcpServerInstanceCreateOrConnectWithoutOrganizationInputSchema } from './UserMcpServerInstanceCreateOrConnectWithoutOrganizationInputSchema';
import { UserMcpServerInstanceCreateManyOrganizationInputEnvelopeSchema } from './UserMcpServerInstanceCreateManyOrganizationInputEnvelopeSchema';
import { UserMcpServerInstanceWhereUniqueInputSchema } from './UserMcpServerInstanceWhereUniqueInputSchema';

export const UserMcpServerInstanceCreateNestedManyWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateNestedManyWithoutOrganizationInput> = z.object({
  create: z.union([ z.lazy(() => UserMcpServerInstanceCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceCreateWithoutOrganizationInputSchema).array(),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => UserMcpServerInstanceCreateManyOrganizationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema),z.lazy(() => UserMcpServerInstanceWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default UserMcpServerInstanceCreateNestedManyWithoutOrganizationInputSchema;
