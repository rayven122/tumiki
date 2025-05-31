import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserIncludeSchema } from '../inputTypeSchemas/UserIncludeSchema'
import { UserWhereUniqueInputSchema } from '../inputTypeSchemas/UserWhereUniqueInputSchema'
import { UserCreateInputSchema } from '../inputTypeSchemas/UserCreateInputSchema'
import { UserUncheckedCreateInputSchema } from '../inputTypeSchemas/UserUncheckedCreateInputSchema'
import { UserUpdateInputSchema } from '../inputTypeSchemas/UserUpdateInputSchema'
import { UserUncheckedUpdateInputSchema } from '../inputTypeSchemas/UserUncheckedUpdateInputSchema'
import { AccountFindManyArgsSchema } from "./AccountFindManyArgsSchema"
import { SessionFindManyArgsSchema } from "./SessionFindManyArgsSchema"
import { UserToolGroupFindManyArgsSchema } from "./UserToolGroupFindManyArgsSchema"
import { UserMcpServerConfigFindManyArgsSchema } from "./UserMcpServerConfigFindManyArgsSchema"
import { UserMcpServerInstanceFindManyArgsSchema } from "./UserMcpServerInstanceFindManyArgsSchema"
import { OrganizationFindManyArgsSchema } from "./OrganizationFindManyArgsSchema"
import { OrganizationMemberFindManyArgsSchema } from "./OrganizationMemberFindManyArgsSchema"
import { OrganizationInvitationFindManyArgsSchema } from "./OrganizationInvitationFindManyArgsSchema"
import { UserCountOutputTypeArgsSchema } from "./UserCountOutputTypeArgsSchema"
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

export const UserUpsertArgsSchema: z.ZodType<Prisma.UserUpsertArgs> = z.object({
  select: UserSelectSchema.optional(),
  include: z.lazy(() => UserIncludeSchema).optional(),
  where: UserWhereUniqueInputSchema,
  create: z.union([ UserCreateInputSchema,UserUncheckedCreateInputSchema ]),
  update: z.union([ UserUpdateInputSchema,UserUncheckedUpdateInputSchema ]),
}).strict() ;

export default UserUpsertArgsSchema;
