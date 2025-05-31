import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { IntFilterSchema } from './IntFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { UserMcpServerConfigScalarRelationFilterSchema } from './UserMcpServerConfigScalarRelationFilterSchema';
import { UserMcpServerConfigWhereInputSchema } from './UserMcpServerConfigWhereInputSchema';
import { UserToolGroupScalarRelationFilterSchema } from './UserToolGroupScalarRelationFilterSchema';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';
import { ToolScalarRelationFilterSchema } from './ToolScalarRelationFilterSchema';
import { ToolWhereInputSchema } from './ToolWhereInputSchema';

export const UserToolGroupToolWhereInputSchema: z.ZodType<Prisma.UserToolGroupToolWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserToolGroupToolWhereInputSchema),z.lazy(() => UserToolGroupToolWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserToolGroupToolWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserToolGroupToolWhereInputSchema),z.lazy(() => UserToolGroupToolWhereInputSchema).array() ]).optional(),
  userMcpServerConfigId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  toolGroupId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  toolId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  sortOrder: z.union([ z.lazy(() => IntFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  userMcpServerConfig: z.union([ z.lazy(() => UserMcpServerConfigScalarRelationFilterSchema),z.lazy(() => UserMcpServerConfigWhereInputSchema) ]).optional(),
  toolGroup: z.union([ z.lazy(() => UserToolGroupScalarRelationFilterSchema),z.lazy(() => UserToolGroupWhereInputSchema) ]).optional(),
  tool: z.union([ z.lazy(() => ToolScalarRelationFilterSchema),z.lazy(() => ToolWhereInputSchema) ]).optional(),
}).strict();

export default UserToolGroupToolWhereInputSchema;
