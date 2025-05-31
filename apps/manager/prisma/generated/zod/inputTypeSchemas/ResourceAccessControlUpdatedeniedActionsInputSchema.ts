import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { PermissionActionSchema } from './PermissionActionSchema';

export const ResourceAccessControlUpdatedeniedActionsInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdatedeniedActionsInput> = z.object({
  set: z.lazy(() => PermissionActionSchema).array().optional(),
  push: z.union([ z.lazy(() => PermissionActionSchema),z.lazy(() => PermissionActionSchema).array() ]).optional(),
}).strict();

export default ResourceAccessControlUpdatedeniedActionsInputSchema;
