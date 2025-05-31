import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlWhereUniqueInputSchema } from './ResourceAccessControlWhereUniqueInputSchema';
import { ResourceAccessControlUpdateWithoutMemberInputSchema } from './ResourceAccessControlUpdateWithoutMemberInputSchema';
import { ResourceAccessControlUncheckedUpdateWithoutMemberInputSchema } from './ResourceAccessControlUncheckedUpdateWithoutMemberInputSchema';
import { ResourceAccessControlCreateWithoutMemberInputSchema } from './ResourceAccessControlCreateWithoutMemberInputSchema';
import { ResourceAccessControlUncheckedCreateWithoutMemberInputSchema } from './ResourceAccessControlUncheckedCreateWithoutMemberInputSchema';

export const ResourceAccessControlUpsertWithWhereUniqueWithoutMemberInputSchema: z.ZodType<Prisma.ResourceAccessControlUpsertWithWhereUniqueWithoutMemberInput> = z.object({
  where: z.lazy(() => ResourceAccessControlWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => ResourceAccessControlUpdateWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlUncheckedUpdateWithoutMemberInputSchema) ]),
  create: z.union([ z.lazy(() => ResourceAccessControlCreateWithoutMemberInputSchema),z.lazy(() => ResourceAccessControlUncheckedCreateWithoutMemberInputSchema) ]),
}).strict();

export default ResourceAccessControlUpsertWithWhereUniqueWithoutMemberInputSchema;
