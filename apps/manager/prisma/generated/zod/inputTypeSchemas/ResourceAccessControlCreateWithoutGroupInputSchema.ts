import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { ResourceAccessControlCreateallowedActionsInputSchema } from './ResourceAccessControlCreateallowedActionsInputSchema';
import { PermissionActionSchema } from './PermissionActionSchema';
import { ResourceAccessControlCreatedeniedActionsInputSchema } from './ResourceAccessControlCreatedeniedActionsInputSchema';
import { OrganizationCreateNestedOneWithoutResourceAclsInputSchema } from './OrganizationCreateNestedOneWithoutResourceAclsInputSchema';
import { OrganizationMemberCreateNestedOneWithoutResourceAclsInputSchema } from './OrganizationMemberCreateNestedOneWithoutResourceAclsInputSchema';

export const ResourceAccessControlCreateWithoutGroupInputSchema: z.ZodType<Prisma.ResourceAccessControlCreateWithoutGroupInput> = z.object({
  id: z.string().optional(),
  resourceType: z.lazy(() => ResourceTypeSchema),
  resourceId: z.string(),
  allowedActions: z.union([ z.lazy(() => ResourceAccessControlCreateallowedActionsInputSchema),z.lazy(() => PermissionActionSchema).array() ]).optional(),
  deniedActions: z.union([ z.lazy(() => ResourceAccessControlCreatedeniedActionsInputSchema),z.lazy(() => PermissionActionSchema).array() ]).optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutResourceAclsInputSchema),
  member: z.lazy(() => OrganizationMemberCreateNestedOneWithoutResourceAclsInputSchema).optional()
}).strict();

export default ResourceAccessControlCreateWithoutGroupInputSchema;
