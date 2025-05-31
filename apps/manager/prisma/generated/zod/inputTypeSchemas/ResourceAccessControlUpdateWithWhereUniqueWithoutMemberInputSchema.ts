import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlUpdateWithoutMemberInputSchema } from './ResourceAccessControlUpdateWithoutMemberInputSchema';
import { ResourceAccessControlUncheckedUpdateWithoutMemberInputSchema } from './ResourceAccessControlUncheckedUpdateWithoutMemberInputSchema';

export const ResourceAccessControlUpdateWithWhereUniqueWithoutMemberInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateWithWhereUniqueWithoutMemberInput> = z.object({
  where: z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => ResourceAccessControlUpdateWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlUncheckedUpdateWithoutMemberInputSchema) ]),
}).strict();

export default ResourceAccessControlUpdateWithWhereUniqueWithoutMemberInputSchema;
