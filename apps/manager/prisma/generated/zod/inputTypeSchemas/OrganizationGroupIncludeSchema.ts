import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { OrganizationMemberFindManyArgsSchema } from "../outputTypeSchemas/OrganizationMemberFindManyArgsSchema"
import { OrganizationRoleFindManyArgsSchema } from "../outputTypeSchemas/OrganizationRoleFindManyArgsSchema"
import { ResourceAccessControlFindManyArgsSchema } from "../outputTypeSchemas/ResourceAccessControlFindManyArgsSchema"
import { OrganizationGroupCountOutputTypeArgsSchema } from "../outputTypeSchemas/OrganizationGroupCountOutputTypeArgsSchema"

export const OrganizationGroupIncludeSchema: z.ZodType<Prisma.OrganizationGroupInclude> = z.object({
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  members: z.union([z.boolean(),z.lazy(() => OrganizationMemberFindManyArgsSchema)]).optional(),
  roles: z.union([z.boolean(),z.lazy(() => OrganizationRoleFindManyArgsSchema)]).optional(),
  resourceAcls: z.union([z.boolean(),z.lazy(() => ResourceAccessControlFindManyArgsSchema)]).optional(),
  _count: z.union([z.boolean(),z.lazy(() => OrganizationGroupCountOutputTypeArgsSchema)]).optional(),
}).strict()

export default OrganizationGroupIncludeSchema;
