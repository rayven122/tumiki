import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationInvitationUpdateManyMutationInputSchema } from '../inputTypeSchemas/OrganizationInvitationUpdateManyMutationInputSchema'
import { OrganizationInvitationUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/OrganizationInvitationUncheckedUpdateManyInputSchema'
import { OrganizationInvitationWhereInputSchema } from '../inputTypeSchemas/OrganizationInvitationWhereInputSchema'

export const OrganizationInvitationUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.OrganizationInvitationUpdateManyAndReturnArgs> = z.object({
  data: z.union([ OrganizationInvitationUpdateManyMutationInputSchema,OrganizationInvitationUncheckedUpdateManyInputSchema ]),
  where: OrganizationInvitationWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default OrganizationInvitationUpdateManyAndReturnArgsSchema;
