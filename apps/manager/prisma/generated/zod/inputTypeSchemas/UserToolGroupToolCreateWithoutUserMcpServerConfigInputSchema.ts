import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema } from './UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema';
import { ToolCreateNestedOneWithoutToolGroupToolsInputSchema } from './ToolCreateNestedOneWithoutToolGroupToolsInputSchema';

export const UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateWithoutUserMcpServerConfigInput> = z.object({
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional(),
  toolGroup: z.lazy(() => UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema),
  tool: z.lazy(() => ToolCreateNestedOneWithoutToolGroupToolsInputSchema)
}).strict();

export default UserToolGroupToolCreateWithoutUserMcpServerConfigInputSchema;
