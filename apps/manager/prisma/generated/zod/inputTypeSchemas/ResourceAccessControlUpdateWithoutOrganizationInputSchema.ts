import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFieldUpdateOperationsInputSchema } from './StringFieldUpdateOperationsInputSchema';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { EnumResourceTypeFieldUpdateOperationsInputSchema } from './EnumResourceTypeFieldUpdateOperationsInputSchema';
import { ResourceAccessControlUpdateallowedActionsInputSchema } from './ResourceAccessControlUpdateallowedActionsInputSchema';
import { PermissionActionSchema } from './PermissionActionSchema';
import { ResourceAccessControlUpdatedeniedActionsInputSchema } from './ResourceAccessControlUpdatedeniedActionsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { OrganizationMemberUpdateOneWithoutResourceAclsNestedInputSchema } from './OrganizationMemberUpdateOneWithoutResourceAclsNestedInputSchema';
import { OrganizationGroupUpdateOneWithoutResourceAclsNestedInputSchema } from './OrganizationGroupUpdateOneWithoutResourceAclsNestedInputSchema';

export const ResourceAccessControlUpdateWithoutOrganizationInputSchema: z.ZodType<Prisma.ResourceAccessControlUpdateWithoutOrganizationInput> = z.object({
  id: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  resourceType: z.union([ z.lazy(() => ResourceTypeSchema),z.lazy(() => EnumResourceTypeFieldUpdateOperationsInputSchema) ]).optional(),
  resourceId: z.union([ z.string(),z.lazy(() => StringFieldUpdateOperationsInputSchema) ]).optional(),
  allowedActions: z.union([ z.lazy(() => ResourceAccessControlUpdateallowedActionsInputSchema),z.lazy(() => PermissionActionSchema).array() ]).optional(),
  deniedActions: z.union([ z.lazy(() => ResourceAccessControlUpdatedeniedActionsInputSchema),z.lazy(() => PermissionActionSchema).array() ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  updatedAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  member: z.lazy(() => OrganizationMemberUpdateOneWithoutResourceAclsNestedInputSchema).optional(),
  group: z.lazy(() => OrganizationGroupUpdateOneWithoutResourceAclsNestedInputSchema).optional()
}).strict();

export default ResourceAccessControlUpdateWithoutOrganizationInputSchema;
