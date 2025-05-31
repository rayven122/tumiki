import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlScalarWhereInputSchema } from './ResourceAccessControlScalarWhereInputSchema';
import { ResourceAccessControlUpdateManyMutationInputSchema } from './ResourceAccessControlUpdateManyMutationInputSchema';
import { ResourceAccessControlUncheckedUpdateManyWithoutGroupInputSchema } from './ResourceAccessControlUncheckedUpdateManyWithoutGroupInputSchema';

export const ResourceAccessControlUpdateManyWithWhereWithoutGroupInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateManyWithWhereWithoutGroupInput> = z.object({
  where: z.lazy(() => ResourceAccessControlScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ResourceAccessControlUpdateManyMutationInputSchema),z.lazy(() => ResourceAccessControlUncheckedUpdateManyWithoutGroupInputSchema) ]),
}).strict();

export default ResourceAccessControlUpdateManyWithWhereWithoutGroupInputSchema;
