import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationInvitationIncludeSchema } from '../inputTypeSchemas/OrganizationInvitationIncludeSchema'
import { OrganizationInvitationWhereInputSchema } from '../inputTypeSchemas/OrganizationInvitationWhereInputSchema'
import { OrganizationInvitationOrderByWithRelationInputSchema } from '../inputTypeSchemas/OrganizationInvitationOrderByWithRelationInputSchema'
import { OrganizationInvitationWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationInvitationWhereUniqueInputSchema'
import { OrganizationInvitationScalarFieldEnumSchema } from '../inputTypeSchemas/OrganizationInvitationScalarFieldEnumSchema'
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const OrganizationInvitationSelectSchema: z.ZodType<Prisma.OrganizationInvitationSelect> = z.object({
  id: z.boolean().optional(),
  organizationId: z.boolean().optional(),
  email: z.boolean().optional(),
  token: z.boolean().optional(),
  invitedBy: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  roleIds: z.boolean().optional(),
  groupIds: z.boolean().optional(),
  expires: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  invitedByUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

export const OrganizationInvitationFindFirstArgsSchema: z.ZodType<Prisma.OrganizationInvitationFindFirstArgs> = z.object({
  select: OrganizationInvitationSelectSchema.optional(),
  include: z.lazy(() => OrganizationInvitationIncludeSchema).optional(),
  where: OrganizationInvitationWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationInvitationOrderByWithRelationInputSchema.array(),OrganizationInvitationOrderByWithRelationInputSchema ]).optional(),
  cursor: OrganizationInvitationWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ OrganizationInvitationScalarFieldEnumSchema,OrganizationInvitationScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export default OrganizationInvitationFindFirstArgsSchema;
