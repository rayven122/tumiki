import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationGroupCountOutputTypeSelectSchema } from './OrganizationGroupCountOutputTypeSelectSchema';

export const OrganizationGroupCountOutputTypeArgsSchema: z.ZodType<Prisma.OrganizationGroupCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => OrganizationGroupCountOutputTypeSelectSchema).nullish(),
}).strict();

export default OrganizationGroupCountOutputTypeSelectSchema;
