import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const UserToolGroupCountOutputTypeSelectSchema: z.ZodType<Prisma.UserToolGroupCountOutputTypeSelect> = z.object({
  toolGroupTools: z.boolean().optional(),
  mcpServerInstanceToolGroups: z.boolean().optional(),
}).strict();

export default UserToolGroupCountOutputTypeSelectSchema;
