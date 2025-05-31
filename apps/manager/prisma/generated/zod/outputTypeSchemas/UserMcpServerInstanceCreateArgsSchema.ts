import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceIncludeSchema } from '../inputTypeSchemas/UserMcpServerInstanceIncludeSchema'
import { UserMcpServerInstanceCreateInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceCreateInputSchema'
import { UserMcpServerInstanceUncheckedCreateInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceUncheckedCreateInputSchema'
import { UserMcpServerInstanceToolGroupFindManyArgsSchema } from "./UserMcpServerInstanceToolGroupFindManyArgsSchema"
import { UserToolGroupArgsSchema } from "./UserToolGroupArgsSchema"
import { UserArgsSchema } from "./UserArgsSchema"
import { OrganizationArgsSchema } from "./OrganizationArgsSchema"
import { UserMcpServerInstanceCountOutputTypeArgsSchema } from "./UserMcpServerInstanceCountOutputTypeArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const UserMcpServerInstanceSelectSchema: z.ZodType<Prisma.UserMcpServerInstanceSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  description: z.boolean().optional(),
  iconPath: z.boolean().optional(),
  serverStatus: z.boolean().optional(),
  serverType: z.boolean().optional(),
  toolGroupId: z.boolean().optional(),
  userId: z.boolean().optional(),
  organizationId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  mcpServerInstanceToolGroups: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceToolGroupFindManyArgsSchema)]).optional(),
  toolGroup: z.union([z.boolean(),z.lazy(() => UserToolGroupArgsSchema)]).optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceCountOutputTypeArgsSchema)]).optional(),
}).strict()

export const UserMcpServerInstanceCreateArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateArgs> = z.object({
  select: UserMcpServerInstanceSelectSchema.optional(),
  include: z.lazy(() => UserMcpServerInstanceIncludeSchema).optional(),
  data: z.union([ UserMcpServerInstanceCreateInputSchema,UserMcpServerInstanceUncheckedCreateInputSchema ]),
}).strict() ;

export default UserMcpServerInstanceCreateArgsSchema;
