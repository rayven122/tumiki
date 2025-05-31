import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupFindManyArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceToolGroupFindManyArgsSchema"
import { UserToolGroupArgsSchema } from "../outputTypeSchemas/UserToolGroupArgsSchema"
import { UserArgsSchema } from "../outputTypeSchemas/UserArgsSchema"
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { UserMcpServerInstanceCountOutputTypeArgsSchema } from "../outputTypeSchemas/UserMcpServerInstanceCountOutputTypeArgsSchema"

export const UserMcpServerInstanceIncludeSchema: z.ZodType<Prisma.UserMcpServerInstanceInclude> = z.object({
  mcpServerInstanceToolGroups: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceToolGroupFindManyArgsSchema)]).optional(),
  toolGroup: z.union([z.boolean(),z.lazy(() => UserToolGroupArgsSchema)]).optional(),
  user: z.union([z.boolean(),z.lazy(() => UserArgsSchema)]).optional(),
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceCountOutputTypeArgsSchema)]).optional(),
}).strict()

export default UserMcpServerInstanceIncludeSchema;
