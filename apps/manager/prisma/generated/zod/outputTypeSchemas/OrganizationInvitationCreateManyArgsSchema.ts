import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationInvitationCreateManyInputSchema } from '../inputTypeSchemas/OrganizationInvitationCreateManyInputSchema'

export const OrganizationInvitationCreateManyArgsSchema: z.ZodType<Prisma.OrganizationInvitationCreateManyArgs> = z.object({
  data: z.union([ OrganizationInvitationCreateManyInputSchema,OrganizationInvitationCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default OrganizationInvitationCreateManyArgsSchema;
