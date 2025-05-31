import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationIncludeSchema } from '../inputTypeSchemas/OrganizationIncludeSchema'
import { OrganizationWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationWhereUniqueInputSchema'
import { UserArgsSchema } from "./UserArgsSchema"
import { OrganizationMemberFindManyArgsSchema } from "./OrganizationMemberFindManyArgsSchema"
import { OrganizationGroupFindManyArgsSchema } from "./OrganizationGroupFindManyArgsSchema"
import { OrganizationRoleFindManyArgsSchema } from "./OrganizationRoleFindManyArgsSchema"
import { ResourceAccessControlFindManyArgsSchema } from "./ResourceAccessControlFindManyArgsSchema"
import { OrganizationInvitationFindManyArgsSchema } from "./OrganizationInvitationFindManyArgsSchema"
import { UserToolGroupFindManyArgsSchema } from "./UserToolGroupFindManyArgsSchema"
import { UserMcpServerConfigFindManyArgsSchema } from "./UserMcpServerConfigFindManyArgsSchema"
import { UserMcpServerInstanceFindManyArgsSchema } from "./UserMcpServerInstanceFindManyArgsSchema"
import { OrganizationCountOutputTypeArgsSchema } from "./OrganizationCountOutputTypeArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

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

export const OrganizationFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.OrganizationFindUniqueOrThrowArgs> = z.object({
  select: OrganizationSelectSchema.optional(),
  include: z.lazy(() => OrganizationIncludeSchema).optional(),
  where: OrganizationWhereUniqueInputSchema,
}).strict() ;

export default OrganizationFindUniqueOrThrowArgsSchema;
