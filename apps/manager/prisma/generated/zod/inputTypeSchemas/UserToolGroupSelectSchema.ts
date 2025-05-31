import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceArgsSchema"
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"
import { UserToolGroupToolFindManyArgsSchema } from "../outputTypeSchemas/UserToolGroupToolFindManyArgsSchema"
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { UserMcpServerInstanceToolGroupFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceToolGroupFindManyArgsSchema"
import { UserToolGroupCountOutputTypeArgsSchema } from "../outputTypeSchemas/UserToolGroupCountOutputTypeArgsSchema"

export const UserToolGroupSelectSchema: z.ZodType<Prisma.UserToolGroupSelect> = z.object({
  id: z.boolean().optional(),
  name: z.boolean().optional(),
  description: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  userId: z.boolean().optional(),
  organizationId: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  mcpServerInstance: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceArgsSchema)]).optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  toolGroupTools: z.union([z.boolean(),z.lazy(() => UserToolGroupToolFindManyArgsSchema)]).optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  mcpServerInstanceToolGroups: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceToolGroupFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserToolGroupCountOutputTypeArgsSchema)]).optional(),
}).strict()

export default UserToolGroupSelectSchema;
