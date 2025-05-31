import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { PermissionActionSchema } from './PermissionActionSchema';

export const ResourceAccessControlCreatedeniedActionsInputSchema: z.ZodType<Prisma.ResourceAccessControlCreatedeniedActionsInput> = z.object({
  set: z.lazy(() => PermissionActionSchema).array()
}).strict();

export default ResourceAccessControlCreatedeniedActionsInputSchema;
