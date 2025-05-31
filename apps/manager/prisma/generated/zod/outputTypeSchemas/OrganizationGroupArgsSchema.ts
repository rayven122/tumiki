import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationGroupSelectSchema } from '../inputTypeSchemas/OrganizationGroupSelectSchema';
import { OrganizationGroupIncludeSchema } from '../inputTypeSchemas/OrganizationGroupIncludeSchema';

export const OrganizationGroupArgsSchema: z.ZodType<Prisma.OrganizationGroupDefaultArgs> = z.object({
  select: z.lazy(() => OrganizationGroupSelectSchema).optional(),
  include: z.lazy(() => OrganizationGroupIncludeSchema).optional(),
}).strict();

export default OrganizationGroupArgsSchema;
