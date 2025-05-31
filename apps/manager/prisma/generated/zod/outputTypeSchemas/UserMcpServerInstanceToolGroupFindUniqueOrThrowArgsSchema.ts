import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupIncludeSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupIncludeSchema'
import { UserMcpServerInstanceToolGroupWhereUniqueInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupWhereUniqueInputSchema'
import { UserMcpServerInstanceArgsSchema } from "./UserMcpServerInstanceArgsSchema"
import { UserToolGroupArgsSchema } from "./UserToolGroupArgsSchema"
// Select schema needs to be in file to prevent circular imports
//------------------------------------------------------

export const UserMcpServerInstanceToolGroupSelectSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupSelect> = z.object({
  mcpServerInstanceId: z.boolean().optional(),
  toolGroupId: z.boolean().optional(),
  sortOrder: z.boolean().optional(),
  createdAt: z.boolean().optional(),
  mcpServerInstance: z.union([z.boolean(),z.lazy(() => UserMcpServerInstanceArgsSchema)]).optional(),
  toolGroup: z.union([z.boolean(),z.lazy(() => UserToolGroupArgsSchema)]).optional(),
}).strict()

export const UserMcpServerInstanceToolGroupFindUniqueOrThrowArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupFindUniqueOrThrowArgs> = z.object({
  select: UserMcpServerInstanceToolGroupSelectSchema.optional(),
  include: z.lazy(() => UserMcpServerInstanceToolGroupIncludeSchema).optional(),
  where: UserMcpServerInstanceToolGroupWhereUniqueInputSchema,
}).strict() ;

export default UserMcpServerInstanceToolGroupFindUniqueOrThrowArgsSchema;
