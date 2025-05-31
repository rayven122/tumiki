import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"

export const OrganizationInvitationIncludeSchema: z.ZodType<Prisma.OrganizationInvitationInclude> = z.object({
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  invitedByUser: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
}).strict()

export default OrganizationInvitationIncludeSchema;
