import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserIncludeSchema } from '../inputTypeSchemas/UserIncludeSchema'
import { UserWhereInputSchema } from '../inputTypeSchemas/UserWhereInputSchema'
import { UserOrderByWithRelationInputSchema } from '../inputTypeSchemas/UserOrderByWithRelationInputSchema'
import { UserWhereUniqueInputSchema } from '../inputTypeSchemas/UserWhereUniqueInputSchema'
import { UserScalarFieldEnumSchema } from '../inputTypeSchemas/UserScalarFieldEnumSchema'
import { AccountFindManyArgsSchema } from "../outputTypeSchemas/AccountFindManyArgsSchema"
import { SessionFindManyArgsSchema } from "../outputTypeSchemas/SessionFindManyArgsSchema"
import { UserToolGroupFindManyArgsSchema } from "../outputTypeSchemas/UserToolGroupFindManyArgsSchema"
import { UserMcpServerConfigFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerConfigFindManyArgsSchema"
import { UserMcpServerInstanceFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceFindManyArgsSchema"
import { OrganizationFindManyArgsSchema } from "../outputTypeSchemas/OrganizationFindManyArgsSchema"
import { OrganizationMemberFindManyArgsSchema } from "../outputTypeSchemas/OrganizationMemberFindManyArgsSchema"
import { OrganizationInvitationFindManyArgsSchema } from "../outputTypeSchemas/OrganizationInvitationFindManyArgsSchema"
import { UserCountOutputTypeArgsSchema } from "../outputTypeSchemas/UserCountOutputTypeArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const UserSelectSchema: z.ZodType<Prisma.UserSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  email: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  image: z.boolean().optional(),
  role: z.boolean().optional(),
  accounts: z.union([z.boolean(),z.lazy(() => AccountFindManyArgsSchema)]).optional(),
  sessions: z.union([z.boolean(),z.lazy(() => SessionFindManyArgsSchema)]).optional(),
  toolGroups: z.union([z.boolean(),z.lazy(() => UserToolGroupFindManyArgsSchema)]).optional(),
  mcpServerConfigs: z.union([z.boolean(),z.lazy(() => UserMcpServerConfigFindManyArgsSchema)]).optional(),
  mcpServerInstances: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceFindManyArgsSchema)]).optional(),
  organizations: z.union([z.boolean(),z.lazy(() => OrganizationFindManyArgsSchema)]).optional(),
  members: z.union([z.boolean(),z.lazy(() => OrganizationMemberFindManyArgsSchema)]).optional(),
  invitations: z.union([z.boolean(),z.lazy(() => OrganizationInvitationFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const UserFindManyArgsSchema: z.ZodType<Prisma.UserFindManyArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: z.lazy(() => UserIncludeSchema).optional(),
  where: UserWhereInputSchema.optional(),
  orderBy: z.union([ UserOrderByWithRelationInputSchema.array(),UserOrderByWithRelationInputSchema ]).optional(),
  cursor: UserWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
  distinct: z.union([ UserScalarFieldEnumSchema,UserScalarFieldEnumSchema.array() ]).optional(),
}).strict() ;

export default UserFindManyArgsSchema;
