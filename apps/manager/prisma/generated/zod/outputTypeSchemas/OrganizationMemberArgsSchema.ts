import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationMemberSelectSchema } from '../inputTypeSchemas/OrganizationMemberSelectSchema';
import { OrganizationMemberIncludeSchema } from '../inputTypeSchemas/OrganizationMemberIncludeSchema';

export const OrganizationMemberArgsSchema: z.ZodType<Prisma.OrganizationMemberDefaultArgs> = z.object({
  select: z.lazy(() => OrganizationMemberSelectSchema).optional(),
  include: z.lazy(() => OrganizationMemberIncludeSchema).optional(),
}).strict();

export default OrganizationMemberArgsSchema;
