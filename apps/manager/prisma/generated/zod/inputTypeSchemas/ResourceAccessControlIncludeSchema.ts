import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationArgsSchema } from "../outputTypeSchemas/OrganizationArgsSchema"
import { OrganizationMemberArgsSchema } from "../outputTypeSchemas/OrganizationMemberArgsSchema"
import { OrganizationGroupArgsSchema } from "../outputTypeSchemas/OrganizationGroupArgsSchema"

export const ResourceAccessControlIncludeSchema: z.ZodType<Prisma.ResourceAccessControlInclude> = z.object({
  organization: z.union([z.boolean(),z.lazy(() => OrganizationArgsSchema)]).optional(),
  member: z.union([z.boolean(),z.lazy(() => OrganizationMemberArgsSchema)]).optional(),
  group: z.union([z.boolean(),z.lazy(() => OrganizationGroupArgsSchema)]).optional(),
}).strict()

export default ResourceAccessControlIncludeSchema;
