import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlWhereInputSchema } from './ResourceAccessControlWhereInputSchema';

export const ResourceAccessControlListRelationFilterSchema: z.ZodType<Prisma.ResourceAccessControlListRelationFilter> = z.object({
  every: z.lazy(() => ResourceAccessControlWhereInputSchema).optional(),
  some: z.lazy(() => ResourceAccessControlWhereInputSchema).optional(),
  none: z.lazy(() => ResourceAccessControlWhereInputSchema).optional()
}).strict();

export default ResourceAccessControlListRelationFilterSchema;
