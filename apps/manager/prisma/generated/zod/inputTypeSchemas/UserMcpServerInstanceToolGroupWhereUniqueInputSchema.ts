import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupMcpServerInstanceIdToolGroupIdCompoundUniqueInputSchema } from './UserMcpServerInstanceToolGroupMcpServerInstanceIdToolGroupIdCompoundUniqueInputSchema';
import { UserMcpServerInstanceToolGroupWhereInputSchema } from './UserMcpServerInstanceToolGroupWhereInputSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { IntFilterSchema } from './IntFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { UserMcpServerInstanceScalarRelationFilterSchema } from './UserMcpServerInstanceScalarRelationFilterSchema';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';
import { UserToolGroupScalarRelationFilterSchema } from './UserToolGroupScalarRelationFilterSchema';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';

export const UserMcpServerInstanceToolGroupWhereUniqueInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupWhereUniqueInput> = z.object({
  mcpServerInstanceId_toolGroupId: z.lazy(() => UserMcpServerInstanceToolGroupMcpServerInstanceIdToolGroupIdCompoundUniqueInputSchema)
})
.and(z.object({
  mcpServerInstanceId_toolGroupId: z.lazy(() => UserMcpServerInstanceToolGroupMcpServerInstanceIdToolGroupIdCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserMcpServerInstanceToolGroupWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupWhereInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupWhereInputSchema).array() ]).optional(),
  mcpServerInstanceId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  toolGroupId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  sortOrder: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  mcpServerInstance: z.union([ z.lazy(() => UserMcpServerInstanceScalarRelationFilterSchema),z.lazy(() => UserMcpServerInstanceWhereInputSchema) ]).optional(),
  toolGroup: z.union([ z.lazy(() => UserToolGroupScalarRelationFilterSchema),z.lazy(() => UserToolGroupWhereInputSchema) ]).optional(),
}).strict());

export default UserMcpServerInstanceToolGroupWhereUniqueInputSchema;
