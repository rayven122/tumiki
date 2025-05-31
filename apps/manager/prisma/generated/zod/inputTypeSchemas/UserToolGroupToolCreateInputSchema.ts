import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema';
import { UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema } from './UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema';
import { ToolCreateNestedOneWithoutToolGroupToolsInputSchema } from './ToolCreateNestedOneWithoutToolGroupToolsInputSchema';

export const UserToolGroupToolCreateInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateInput> = z.object({
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional(),
  userMcpServerConfig: z.lazy(() => UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema),
  toolGroup: z.lazy(() => UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema),
  tool: z.lazy(() => ToolCreateNestedOneWithoutToolGroupToolsInputSchema)
}).strict();

export default UserToolGroupToolCreateInputSchema;
