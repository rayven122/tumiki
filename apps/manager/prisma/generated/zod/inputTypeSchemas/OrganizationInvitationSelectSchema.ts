import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"

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

export default OrganizationInvitationSelectSchema;
