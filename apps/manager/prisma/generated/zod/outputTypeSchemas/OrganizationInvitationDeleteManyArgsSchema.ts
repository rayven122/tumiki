import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationInvitationWhereInputSchema } from '../inputTypeSchemas/OrganizationInvitationWhereInputSchema'

export const OrganizationInvitationDeleteManyArgsSchema: z.ZodType<Prisma.OrganizationInvitationDeleteManyArgs> = z.object({
  where: OrganizationInvitationWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default OrganizationInvitationDeleteManyArgsSchema;
