import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { IntFieldUpdateOperationsInputSchema } from './IntFieldUpdateOperationsInputSchema';
import { DateTimeFieldUpdateOperationsInputSchema } from './DateTimeFieldUpdateOperationsInputSchema';
import { UserMcpServerConfigUpdateOneRequiredWithoutUserToolGroupToolsNestedInputSchema } from './UserMcpServerConfigUpdateOneRequiredWithoutUserToolGroupToolsNestedInputSchema';
import { ToolUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema } from './ToolUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema';

export const UserToolGroupToolUpdateWithoutToolGroupInputSchema: z.ZodType<Prisma.UserToolGroupToolUpdateWithoutToolGroupInput> = z.object({
  sortOrder: z.union([ z.number(),z.lazy(() => IntFieldUpdateOperationsInputSchema) ]).optional(),
  createdAt: z.union([ z.coerce.date(),z.lazy(() => DateTimeFieldUpdateOperationsInputSchema) ]).optional(),
  userMcpServerConfig: z.lazy(() => UserMcpServerConfigUpdateOneRequiredWithoutUserToolGroupToolsNestedInputSchema).optional(),
  tool: z.lazy(() => ToolUpdateOneRequiredWithoutToolGroupToolsNestedInputSchema).optional()
}).strict();

export default UserToolGroupToolUpdateWithoutToolGroupInputSchema;
