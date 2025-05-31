import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema';
import { ToolCreateNestedOneWithoutToolGroupToolsInputSchema } from './ToolCreateNestedOneWithoutToolGroupToolsInputSchema';

export const UserToolGroupToolCreateWithoutToolGroupInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateWithoutToolGroupInput> = z.object({
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional(),
  userMcpServerConfig: z.lazy(() => UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema),
  tool: z.lazy(() => ToolCreateNestedOneWithoutToolGroupToolsInputSchema)
}).strict();

export default UserToolGroupToolCreateWithoutToolGroupInputSchema;
