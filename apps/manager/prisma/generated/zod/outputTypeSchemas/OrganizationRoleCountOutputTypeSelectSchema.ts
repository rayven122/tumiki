import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const OrganizationRoleCountOutputTypeSelectSchema: z.ZodType<Prisma.OrganizationRoleCountOutputTypeSelect> = z.object({
  permissions: z.boolean().optional(),
  members: z.boolean().optional(),
  groups: z.boolean().optional(),
}).strict();

export default OrganizationRoleCountOutputTypeSelectSchema;
