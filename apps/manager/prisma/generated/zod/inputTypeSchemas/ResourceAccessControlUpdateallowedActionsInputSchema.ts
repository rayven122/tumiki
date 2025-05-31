import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { PermissionActionSchema } from './PermissionActionSchema';

export const ResourceAccessControlUpdateallowedActionsInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateallowedActionsInput> = z.object({
  set: z.lazy(() => PermissionActionSchema).array().optional(),
  push: z.union([ z.lazy(() => PermissionActionSchema),z.lazy(() => PermissionActionSchema).array() ]).optional(),
}).strict();

export default ResourceAccessControlUpdateallowedActionsInputSchema;
