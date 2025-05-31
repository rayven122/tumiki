import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlScalarWhereInputSchema } from './ResourceAccessControlScalarWhereInputSchema';
import { ResourceAccessControlUpdateManyMutationInputSchema } from './ResourceAccessControlUpdateManyMutationInputSchema';
import { ResourceAccessControlUncheckedUpdateManyWithoutMemberInputSchema } from './ResourceAccessControlUncheckedUpdateManyWithoutMemberInputSchema';

export const ResourceAccessControlUpdateManyWithWhereWithoutMemberInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateManyWithWhereWithoutMemberInput> = z.object({
  where: z.lazy(() => ResourceAccessControlScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ResourceAccessControlUpdateManyMutationInputSchema),z.lazy(() => ResourceAccessControlUncheckedUpdateManyWithoutMemberInputSchema) ]),
}).strict();

export default ResourceAccessControlUpdateManyWithWhereWithoutMemberInputSchema;
