import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlCreateWithoutMemberInputSchema } from './ResourceAccessControlCreateWithoutMemberInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutMemberInputSchema } from './ResourceAccessControlUncheckedCreateWithoutMemberInputSchema';

export const ResourceAccessControlCreateOrConnectWithoutMemberInputSchema: z.ZodType<Prisma.ResourceAccessControlCreateOrConnectWithoutMemberInput> = z.object({
  where: z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutMemberInputSchema) ]),
}).strict();

export default ResourceAccessControlCreateOrConnectWithoutMemberInputSchema;
