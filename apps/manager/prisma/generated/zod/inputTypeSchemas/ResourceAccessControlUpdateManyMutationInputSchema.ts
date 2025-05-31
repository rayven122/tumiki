import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { EnumResourceTypeFieldUpdateOperationsInputSchema } from './EnumResourceTypeFieldUpdateOperationsInputSchema';
import { ResourceAccessControlUpdateallowedActionsInputSchema } from './ResourceAccessControlUpdateallowedActionsInputSchema';
import { PermissionActionSchema } from './PermissionActionSchema';
import { ResourceAccessControlUpdatedeniedActionsInputSchema } from './ResourceAccessControlUpdatedeniedActionsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';

export const ResourceAccessControlUpdateManyMutationInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateManyMutationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  resourceType: z.union([ z.lazy(() => ResourceTypeSchema),z.lazy(() => EnumResourceTypeFieldUpdateOperationsInputSchema) ]).optional(),
  resourceId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  allowedActions: z.union([ z.lazy(() => ResourceAccessControlUpdateallowedActionsInputSchema),z.lazy(() => PermissionActionSchema).array() ]).optional(),
  deniedActions: z.union([ z.lazy(() => ResourceAccessControlUpdatedeniedActionsInputSchema),z.lazy(() => PermissionActionSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
}).strict();

export default ResourceAccessControlUpdateManyMutationInputSchema;
