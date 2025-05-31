import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlScalarWhereInputSchema } from './ResourceAccessControlScalarWhereInputSchema';
import { ResourceAccessControlUpdateManyMutationInputSchema } from './ResourceAccessControlUpdateManyMutationInputSchema';
import { ResourceAccessControlUncheckedUpdateManyWithoutOrganizationInputSchema } from './ResourceAccessControlUncheckedUpdateManyWithoutOrganizationInputSchema';

export const ResourceAccessControlUpdateManyWithWhereWithoutOrganizationInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateManyWithWhereWithoutOrganizationInput> = z.object({
  where: z.lazy(() => ResourceAccessControlScalarWhereInputSchema),
  data: z.union([ z.lazy(() => ResourceAccessControlUpdateManyMutationInputSchema),z.lazy(() => ResourceAccessControlUncheckedUpdateManyWithoutOrganizationInputSchema) ]),
}).strict();

export default ResourceAccessControlUpdateManyWithWhereWithoutOrganizationInputSchema;
