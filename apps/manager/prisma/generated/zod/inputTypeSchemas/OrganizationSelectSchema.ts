import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"
import { OrganizationMemberFindManyArgsSchema } from "../outputTypeSchemas/OrganizationMemberFindManyArgsSchema"
import { OrganizationGroupFindManyArgsSchema } from "../outputTypeSchemas/OrganizationGroupFindManyArgsSchema"
import { OrganizationRoleFindManyArgsSchema } from "../outputTypeSchemas/OrganizationRoleFindManyArgsSchema"
import { ResourceAccessControlFindManyArgsSchema } from "../outputTypeSchemas/ResourceAccessControlFindManyArgsSchema"
import { OrganizationInvitationFindManyArgsSchema } from "../outputTypeSchemas/OrganizationInvitationFindManyArgsSchema"
import { UserToolGroupFindManyArgsSchema } from "../outputTypeSchemas/UserToolGroupFindManyArgsSchema"
import { UserMcpServerConfigFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerConfigFindManyArgsSchema"
import { UserMcpServerInstanceFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceFindManyArgsSchema"
import { OrganizationCountOutputTypeArgsSchema } from "../outputTypeSchemas/OrganizationCountOutputTypeArgsSchema"

export const OrganizationSelectSchema: z.ZodType<Prisma.OrganizationSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  description: z.boolean().optional(),
  logoUrl: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdBy: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  creator: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  members: z.union([z.boolean(),z.lazy(() => OrganizationMemberFindManyArgsSchema)]).optional(),
  groups: z.union([z.boolean(),z.lazy(() => OrganizationGroupFindManyArgsSchema)]).optional(),
  roles: z.union([z.boolean(),z.lazy(() => OrganizationRoleFindManyArgsSchema)]).optional(),
  resourceAcls: z.union([z.boolean(),z.lazy(() => ResourceAccessControlFindManyArgsSchema)]).optional(),
  invitations: z.union([z.boolean(),z.lazy(() => OrganizationInvitationFindManyArgsSchema)]).optional(),
  toolGroups: z.union([z.boolean(),z.lazy(() => UserToolGroupFindManyArgsSchema)]).optional(),
  mcpServerConfigs: z.union([z.boolean(),z.lazy(() => UserMcpServerConfigFindManyArgsSchema)]).optional(),
  mcpServerInstances: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => OrganizationCountOutputTypeArgsSchema)]).optional(),
}).strict()

export default OrganizationSelectSchema;
