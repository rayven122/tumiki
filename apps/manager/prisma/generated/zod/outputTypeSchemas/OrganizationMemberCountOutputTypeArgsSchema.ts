import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationMemberCountOutputTypeSelectSchema } from './OrganizationMemberCountOutputTypeSelectSchema';

export const OrganizationMemberCountOutputTypeArgsSchema: z.ZodType<Prisma.OrganizationMemberCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => OrganizationMemberCountOutputTypeSelectSchema).nullish(),
}).strict();

export default OrganizationMemberCountOutputTypeSelectSchema;
