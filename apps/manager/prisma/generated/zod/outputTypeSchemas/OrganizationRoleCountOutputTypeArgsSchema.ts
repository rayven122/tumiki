import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleCountOutputTypeSelectSchema } from './OrganizationRoleCountOutputTypeSelectSchema';

export const OrganizationRoleCountOutputTypeArgsSchema: z.ZodType<Prisma.OrganizationRoleCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => OrganizationRoleCountOutputTypeSelectSchema).nullish(),
}).strict();

export default OrganizationRoleCountOutputTypeSelectSchema;
