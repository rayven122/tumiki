import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceArgsSchema"
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"
import { UserToolGroupToolFindManyArgsSchema } from "../outputTypeSchemas/UserToolGroupToolFindManyArgsSchema"
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { UserMcpServerInstanceToolGroupFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceToolGroupFindManyArgsSchema"
import { UserToolGroupCountOutputTypeArgsSchema } from "../outputTypeSchemas/UserToolGroupCountOutputTypeArgsSchema"

export const UserToolGroupIncludeSchema: z.ZodType<Prisma.UserToolGroupInclude> = z.object({
  mcpServerInstance: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceArgsSchema)]).optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  toolGroupTools: z.union([z.boolean(),z.lazy(() => UserToolGroupToolFindManyArgsSchema)]).optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  mcpServerInstanceToolGroups: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceToolGroupFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserToolGroupCountOutputTypeArgsSchema)]).optional(),
}).strict()

export default UserToolGroupIncludeSchema;
