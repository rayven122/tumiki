import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleArgsSchema } from "../outputTypeSchemas/OrganizationRoleArgsSchema"

export const RolePermissionSelectSchema: z.ZodType<Prisma.RolePermissionSelect> = z.object({
  id: z.boolean().optional(),
  roleId: z.boolean().optional(),
  resourceType: z.boolean().optional(),
  action: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  updatedAt: z.boolean().optional(),
  role: z.union([z.boolean(),z.lazy(() => OrganizationRoleArgsSchema)]).optional(),
}).strict()

export default RolePermissionSelectSchema;
