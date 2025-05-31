import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationInvitationIncludeSchema } from '../inputTypeSchemas/OrganizationInvitationIncludeSchema'
import { OrganizationInvitationWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationInvitationWhereUniqueInputSchema'
import { OrganizationArgsSchema } from "./OrganizationArgsSchema"
import { UserArgsSchema } from "./UserArgsSchema"
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

export const OrganizationInvitationFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.OrganizationInvitationFindUniqueOrThrowArgs> = z.object({
  select: OrganizationInvitationSelectSchema.optional(),
  include: z.lazy(() => OrganizationInvitationIncludeSchema).optional(),
  where: OrganizationInvitationWhereUniqueInputSchema,
}).strict() ;

export default OrganizationInvitationFindUniqueOrThrowArgsSchema;
