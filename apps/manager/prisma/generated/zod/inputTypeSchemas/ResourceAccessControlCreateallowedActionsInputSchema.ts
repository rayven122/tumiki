import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { PermissionActionSchema } from './PermissionActionSchema';

export const ResourceAccessControlCreateallowedActionsInputSchema: z.ZodType<Prisma.ResourceAccessControlCreateallowedActionsInput> = z.object({
  set: z.lazy(() => PermissionActionSchema).array()
}).strict();

export default ResourceAccessControlCreateallowedActionsInputSchema;
