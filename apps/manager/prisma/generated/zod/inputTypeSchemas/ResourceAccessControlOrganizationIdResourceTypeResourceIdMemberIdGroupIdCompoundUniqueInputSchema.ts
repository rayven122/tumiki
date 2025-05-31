import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceTypeSchema } from './ResourceTypeSchema';

export const ResourceAccessControlOrganizationIdResourceTypeResourceIdMemberIdGroupIdCompoundUniqueInputSchema: z.ZodType<Prisma.ResourceAccessControlOrganizationIdResourceTypeResourceIdMemberIdGroupIdCompoundUniqueInput> = z.object({
  organizationId: z.string(),
  resourceType: z.lazy(() => ResourceTypeSchema),
  resourceId: z.string(),
  memberId: z.string(),
  groupId: z.string()
}).strict();

export default ResourceAccessControlOrganizationIdResourceTypeResourceIdMemberIdGroupIdCompoundUniqueInputSchema;
