import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { ResourceAccessControlCreateallowedActionsInputSchema } from './ResourceAccessControlCreateallowedActionsInputSchema';
import { PermissionActionSchema } from './PermissionActionSchema';
import { ResourceAccessControlCreatedeniedActionsInputSchema } from './ResourceAccessControlCreatedeniedActionsInputSchema';

export const ResourceAccessControlCreateManyGroupInputSchema: z.ZodType<Prisma.ResourceAccessControlCreateManyGroupInput> = z.object({
  id: z.string().optional(),
  organizationId: z.string(),
  resourceType: z.lazy(() => ResourceTypeSchema),
  resourceId: z.string(),
  memberId: z.string().optional().nullable(),
  allowedActions: z.union([ z.lazy(() => ResourceAccessControlCreateallowedActionsInputSchema),z.lazy(() => PermissionActionSchema).array() ]).optional(),
  deniedActions: z.union([ z.lazy(() => ResourceAccessControlCreatedeniedActionsInputSchema),z.lazy(() => PermissionActionSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default ResourceAccessControlCreateManyGroupInputSchema;
