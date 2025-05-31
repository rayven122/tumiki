import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleArgsSchema } from "../outputTypeSchemas/OrganizationRoleArgsSchema"

export const RolePermissionIncludeSchema: z.ZodType<Prisma.RolePermissionInclude> = z.object({
  role: z.union([z.boolean(),z.lazy(() => OrganizationRoleArgsSchema)]).optional(),
}).strict()

export default RolePermissionIncludeSchema;
