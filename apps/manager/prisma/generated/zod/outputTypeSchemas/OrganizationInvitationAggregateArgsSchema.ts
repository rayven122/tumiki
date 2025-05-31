import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationInvitationWhereInputSchema } from '../inputTypeSchemas/OrganizationInvitationWhereInputSchema'
import { OrganizationInvitationOrderByWithRelationInputSchema } from '../inputTypeSchemas/OrganizationInvitationOrderByWithRelationInputSchema'
import { OrganizationInvitationWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationInvitationWhereUniqueInputSchema'

export const OrganizationInvitationAggregateArgsSchema: z.ZodType<Prisma.OrganizationInvitationAggregateArgs> = z.object({
  where: OrganizationInvitationWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationInvitationOrderByWithRelationInputSchema.array(),OrganizationInvitationOrderByWithRelationInputSchema ]).optional(),
  cursor: OrganizationInvitationWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default OrganizationInvitationAggregateArgsSchema;
