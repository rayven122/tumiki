import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationInvitationWhereInputSchema } from '../inputTypeSchemas/OrganizationInvitationWhereInputSchema'
import { OrganizationInvitationOrderByWithAggregationInputSchema } from '../inputTypeSchemas/OrganizationInvitationOrderByWithAggregationInputSchema'
import { OrganizationInvitationScalarFieldEnumSchema } from '../inputTypeSchemas/OrganizationInvitationScalarFieldEnumSchema'
import { OrganizationInvitationScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/OrganizationInvitationScalarWhereWithAggregatesInputSchema'

export const OrganizationInvitationGroupByArgsSchema: z.ZodType<Prisma.OrganizationInvitationGroupByArgs> = z.object({
  where: OrganizationInvitationWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationInvitationOrderByWithAggregationInputSchema.array(),OrganizationInvitationOrderByWithAggregationInputSchema ]).optional(),
  by: OrganizationInvitationScalarFieldEnumSchema.array(),
  having: OrganizationInvitationScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default OrganizationInvitationGroupByArgsSchema;
