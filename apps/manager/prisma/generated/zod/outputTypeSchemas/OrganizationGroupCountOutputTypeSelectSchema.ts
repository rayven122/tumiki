import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const OrganizationGroupCountOutputTypeSelectSchema: z.ZodType<Prisma.OrganizationGroupCountOutputTypeSelect> = z.object({
  members: z.boolean().optional(),
  roles: z.boolean().optional(),
  resourceAcls: z.boolean().optional(),
}).strict();

export default OrganizationGroupCountOutputTypeSelectSchema;
