import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema } from './UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema';
import { UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema } from './UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema';

export const UserToolGroupToolCreateWithoutToolInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateWithoutToolInput> = z.object({
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional(),
  userMcpServerConfig: z.lazy(() => UserMcpServerConfigCreateNestedOneWithoutUserToolGroupToolsInputSchema),
  toolGroup: z.lazy(() => UserToolGroupCreateNestedOneWithoutToolGroupToolsInputSchema)
}).strict();

export default UserToolGroupToolCreateWithoutToolInputSchema;
