import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleWhereInputSchema } from '../inputTypeSchemas/OrganizationRoleWhereInputSchema'

export const OrganizationRoleDeleteManyArgsSchema: z.ZodType<Prisma.OrganizationRoleDeleteManyArgs> = z.object({
  where: OrganizationRoleWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default OrganizationRoleDeleteManyArgsSchema;
