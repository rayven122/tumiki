import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const OrganizationMemberCountOutputTypeSelectSchema: z.ZodType<Prisma.OrganizationMemberCountOutputTypeSelect> = z.object({
  roles: z.boolean().optional(),
  groups: z.boolean().optional(),
  resourceAcls: z.boolean().optional(),
}).strict();

export default OrganizationMemberCountOutputTypeSelectSchema;
