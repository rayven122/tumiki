import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationInvitationOrganizationIdEmailCompoundUniqueInputSchema: z.ZodType<Prisma.OrganizationInvitationOrganizationIdEmailCompoundUniqueInput> = z.object({
  organizationId: z.string(),
  email: z.string()
}).strict();

export default OrganizationInvitationOrganizationIdEmailCompoundUniqueInputSchema;
