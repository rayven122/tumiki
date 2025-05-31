import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { RolePermissionSelectSchema } from '../inputTypeSchemas/RolePermissionSelectSchema';
import { RolePermissionIncludeSchema } from '../inputTypeSchemas/RolePermissionIncludeSchema';

export const RolePermissionArgsSchema: z.ZodType<Prisma.RolePermissionDefaultArgs> = z.object({
  select: z.lazy(() => RolePermissionSelectSchema).optional(),
  include: z.lazy(() => RolePermissionIncludeSchema).optional(),
}).strict();

export default RolePermissionArgsSchema;
