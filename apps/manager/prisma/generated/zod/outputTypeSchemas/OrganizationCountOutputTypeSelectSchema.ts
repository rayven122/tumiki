import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const OrganizationCountOutputTypeSelectSchema: z.ZodType<Prisma.OrganizationCountOutputTypeSelect> = z.object({
  members: z.boolean().optional(),
  groups: z.boolean().optional(),
  roles: z.boolean().optional(),
  resourceAcls: z.boolean().optional(),
  invitations: z.boolean().optional(),
  toolGroups: z.boolean().optional(),
  mcpServerConfigs: z.boolean().optional(),
  mcpServerInstances: z.boolean().optional(),
}).strict();

export default OrganizationCountOutputTypeSelectSchema;
