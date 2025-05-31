import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlCreateWithoutMemberInputSchema } from './ResourceAccessControlCreateWithoutMemberInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutMemberInputSchema } from './ResourceAccessControlUncheckedCreateWithoutMemberInputSchema';
import { ResourceAccessControlCreateOrConnectWithoutMemberInputSchema } from './ResourceAccessControlCreateOrConnectWithoutMemberInputSchema';
import { ResourceAccessControlCreateManyMemberInputEnvelopeSchema } from './ResourceAccessControlCreateManyMemberInputEnvelopeSchema';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';

export const ResourceAccessControlCreateNestedManyWithoutMemberInputSchema: z.ZodType<Prisma.ResourceAccessControlCreateNestedManyWithoutMemberInput> = z.object({
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlCreateWithoutMemberInputSchema).array(),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutMemberInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => ResourceAccessControlCreateOrConnectWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlCreateOrConnectWithoutMemberInputSchema).array() ]).optional(),
  createMany: z.lazy(() => ResourceAccessControlCreateManyMemberInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),z.lazy(() => ResourceAccessControlWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default ResourceAccessControlCreateNestedManyWithoutMemberInputSchema;
