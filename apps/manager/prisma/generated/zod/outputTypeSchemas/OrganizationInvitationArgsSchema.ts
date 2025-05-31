import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationInvitationSelectSchema } from '../inputTypeSchemas/OrganizationInvitationSelectSchema';
import { OrganizationInvitationIncludeSchema } from '../inputTypeSchemas/OrganizationInvitationIncludeSchema';

export const OrganizationInvitationArgsSchema: z.ZodType<Prisma.OrganizationInvitationDefaultArgs> = z.object({
  select: z.lazy(() => OrganizationInvitationSelectSchema).optional(),
  include: z.lazy(() => OrganizationInvitationIncludeSchema).optional(),
}).strict();

export default OrganizationInvitationArgsSchema;
