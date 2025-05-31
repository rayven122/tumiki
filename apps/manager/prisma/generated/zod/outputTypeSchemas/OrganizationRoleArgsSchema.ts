import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleSelectSchema } from '../inputTypeSchemas/OrganizationRoleSelectSchema';
import { OrganizationRoleIncludeSchema } from '../inputTypeSchemas/OrganizationRoleIncludeSchema';

export const OrganizationRoleArgsSchema: z.ZodType<Prisma.OrganizationRoleDefaultArgs> = z.object({
  select: z.lazy(() => OrganizationRoleSelectSchema).optional(),
  include: z.lazy(() => OrganizationRoleIncludeSchema).optional(),
}).strict();

export default OrganizationRoleArgsSchema;
