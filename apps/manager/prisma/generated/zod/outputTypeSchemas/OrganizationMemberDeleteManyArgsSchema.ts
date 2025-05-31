import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationMemberWhereInputSchema } from '../inputTypeSchemas/OrganizationMemberWhereInputSchema'

export const OrganizationMemberDeleteManyArgsSchema: z.ZodType<Prisma.OrganizationMemberDeleteManyArgs> = z.object({
  where: OrganizationMemberWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default OrganizationMemberDeleteManyArgsSchema;
