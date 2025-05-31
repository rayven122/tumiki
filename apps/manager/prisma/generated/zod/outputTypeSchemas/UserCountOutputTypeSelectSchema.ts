import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const UserCountOutputTypeSelectSchema: z.ZodType<Prisma.UserCountOutputTypeSelect> = z.object({
  accounts: z.boolean().optional(),
  sessions: z.boolean().optional(),
  toolGroups: z.boolean().optional(),
  mcpServerConfigs: z.boolean().optional(),
  mcpServerInstances: z.boolean().optional(),
  organizations: z.boolean().optional(),
  members: z.boolean().optional(),
  invitations: z.boolean().optional(),
}).strict();

export default UserCountOutputTypeSelectSchema;
